import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, Filter, Loader2, Search, Upload } from 'lucide-react';
import { Button } from '../../../components/ui';
import { db } from '../../../lib/db';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Product } from '../../../types';

import type { Category } from '../../../types';
import { buildProductRow, buildImportPayload, findImportTarget, getCategoryType, parseDelimitedRows, rowsFromCells, transferFields, transferLabels } from '../../../lib/productTransfer';
import type { ImportedProductRow, ProductFamily } from '../../../lib/productTransfer';

const escapeXml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const downloadTextFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const parseWorkbookRows = (text: string, family: ProductFamily): ImportedProductRow[] => {
    const trimmed = text.replace(/^\uFEFF/, '').trim();
    if (trimmed.startsWith('<?xml') || trimmed.includes('<Workbook')) {
        const doc = new DOMParser().parseFromString(trimmed, 'application/xml');
        if (doc.querySelector('parsererror')) throw new Error('ملف Excel غير قابل للقراءة');
        const worksheets = Array.from(doc.getElementsByTagNameNS('*', 'Worksheet'));
        const sheet = worksheets.length > 1
            ? worksheets.find(item => item.getAttributeNS('urn:schemas-microsoft-com:office:spreadsheet', 'Name') === family)
            : worksheets[0];
        if (worksheets.length > 1 && !sheet) throw new Error('اختَر ملف القسم المطلوب؛ الملف يحتوي أكثر من ورقة');
        const rows = Array.from((sheet || doc).getElementsByTagNameNS('*', 'Row')).map(row => {
            const values: string[] = [];
            for (const cell of Array.from(row.getElementsByTagNameNS('*', 'Cell'))) {
                const index = Number(cell.getAttributeNS('urn:schemas-microsoft-com:office:spreadsheet', 'Index'));
                if (index > 0) while (values.length < index - 1) values.push('');
                values.push(cell.getElementsByTagNameNS('*', 'Data')[0]?.textContent || '');
            }
            return values;
        });
        return rowsFromCells(rows, family);
    }
    if (trimmed.includes('<table')) {
        const doc = new DOMParser().parseFromString(trimmed, 'text/html');
        return rowsFromCells(Array.from(doc.querySelectorAll('tr')).map(row =>
            Array.from(row.querySelectorAll('th, td')).map(cell => cell.textContent || '')), family);
    }
    return rowsFromCells(parseDelimitedRows(trimmed), family);
};

interface ProductImportExportSubTabProps {
    products: Product[];
    categories: Category[];
    canEdit: boolean;
}

export const ProductImportExportSubTab: React.FC<ProductImportExportSubTabProps> = ({ products, categories, canEdit }) => {
    const { user } = useAuth();
    const toast = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<ProductFamily>('STYROFOAM');
    const fields = transferFields(typeFilter);
    const fieldLabels = transferLabels(typeFilter);
    const familyLabel = typeFilter === 'PAINT' ? 'الأصباغ' : typeFilter === 'ADHESIVE' ? 'المادة اللاصقة' : 'الفلين';
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState<number | 'ALL'>(50);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importTotal, setImportTotal] = useState(0);
    const [importStage, setImportStage] = useState<'idle' | 'reading' | 'checking' | 'importing' | 'syncing' | 'done' | 'error'>('idle');
    const [importFileName, setImportFileName] = useState('');
    const [lastImportSummary, setLastImportSummary] = useState<{ updated: number; skipped: number } | null>(null);

    const rows = useMemo(() => products.map(product => buildProductRow(product, categories)), [products, categories]);
    const filteredRows = useMemo(() => rows.filter(row => {
        const matchesSearch = [row.code, row.name, row.paintType, row.category, row.dimensions].join(' ').toLowerCase().includes(search.toLowerCase());
        const matchesType = getCategoryType(categories, row.category) === typeFilter;
        const matchesCategory = categoryFilter === 'ALL' || row.category === categoryFilter;
        return matchesSearch && matchesType && matchesCategory;
    }), [rows, search, typeFilter, categoryFilter, categories]);

    useEffect(() => {
        setPage(0);
    }, [search, typeFilter, categoryFilter, rowsPerPage]);

    const totalPages = rowsPerPage === 'ALL' ? 1 : Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
    const visibleRows = rowsPerPage === 'ALL'
        ? filteredRows
        : filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const visibleStart = filteredRows.length === 0 ? 0 : (rowsPerPage === 'ALL' ? 1 : page * rowsPerPage + 1);
    const visibleEnd = rowsPerPage === 'ALL' ? filteredRows.length : Math.min(filteredRows.length, (page + 1) * rowsPerPage);

    const exportExcel = () => {
        const header = fields.map(field => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(fieldLabels[field])}</Data></Cell>`).join('');
        const body = filteredRows.map(row => {
            const cells = fields.map(field => {
                const value = row[field];
                const type = typeof value === 'number' ? 'Number' : 'String';
                return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
            }).join('');
            return `<Row>${cells}</Row>`;
        }).join('');

        const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${typeFilter}">
  <Table>
   <Row>${header}</Row>
   ${body}
  </Table>
 </Worksheet>
</Workbook>`;

        downloadTextFile(`voga-${typeFilter.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xls`, workbook, 'application/vnd.ms-excel;charset=utf-8');
    };

    const exportPdf = () => {
        const printableRows = filteredRows.map(row => `
            <tr>
                ${fields.map(field => `<td>${escapeXml(row[field])}</td>`).join('')}
            </tr>
        `).join('');
        const html = `
<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>تصدير المنتجات</title>
  <style>
    body { font-family: Arial, Tahoma, sans-serif; padding: 24px; color: #0f172a; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    p { margin: 0 0 20px; color: #64748b; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px; text-align: center; }
    th { background: #0e3c63; color: white; }
    tr:nth-child(even) td { background: #f8fafc; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>تقرير منتجات VOGA — ${familyLabel}</h1>
  <p>عدد المنتجات: ${filteredRows.length} | التاريخ: ${new Date().toLocaleDateString('ar-IQ')}</p>
  <table>
    <thead><tr>${fields.map(field => `<th>${escapeXml(fieldLabels[field])}</th>`).join('')}</tr></thead>
    <tbody>${printableRows}</tbody>
  </table>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('تعذر فتح نافذة PDF', 'تأكد من السماح بالنوافذ المنبثقة لهذا الموقع.');
            return;
        }
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleImportFile = async (file: File) => {
        if (!canEdit || !user) return;
        setImporting(true);
        setImportProgress(0);
        setImportTotal(0);
        setImportStage('reading');
        setImportFileName(file.name);
        setLastImportSummary(null);

        try {
            if (file.size > 10 * 1024 * 1024) throw new Error('حجم الملف أكبر من 10 ميغابايت');
            const text = await file.text();
            setImportStage('checking');
            const importedRows = parseWorkbookRows(text, typeFilter);
            if (importedRows.length === 0) throw new Error('الملف فارغ أو لا يحتوي منتجات');

            const ids = new Set<string>();
            const prepared = importedRows.map((row, index) => {
                try {
                    const target = findImportTarget(row, products, categories, typeFilter);
                    if (!target) return null;
                    if (ids.has(String(target.id))) throw new Error('المنتج مكرر في الملف');
                    ids.add(String(target.id));
                    return { target, payload: buildImportPayload(row, target, categories, typeFilter) };
                } catch (error) {
                    throw new Error(`الصف ${index + 2}: ${error instanceof Error ? error.message : 'بيانات غير صالحة'}`);
                }
            });
            let updated = 0;
            const skipped = prepared.filter(row => !row).length;
            if (skipped === prepared.length) throw new Error('لا توجد منتجات مطابقة؛ لم يتم تغيير أي منتج');
            setImportTotal(prepared.length);
            setImportStage('importing');
            for (const [index, entry] of prepared.entries()) {
                if (!entry) { setImportProgress(index + 1); continue; }
                const { target, payload } = entry;
                const { data, error } = await supabase.from('products').update(payload).eq('id', target.id).select('id').single();
                if (error || !data) throw new Error(`تم تحديث ${updated} منتج قبل التوقف. تعذر حفظ ${target.code}: ${error?.message || 'لا توجد صلاحية للتعديل'}`);
                updated += 1;
                setImportProgress(index + 1);
            }

            setImportStage('syncing');
            await db.fetchProducts();
            setLastImportSummary({ updated, skipped });
            setImportStage('done');
            toast.success('تم استيراد ملف المنتجات', `تم تحديث ${updated} منتج${skipped ? ` وتخطي ${skipped}` : ''}.`);
            setTimeout(() => {
                setImporting(false);
                setImportStage('idle');
                setImportFileName('');
            }, 1200);
        } catch (err: any) {
            await db.fetchProducts();
            setImportStage('error');
            toast.error('فشل استيراد الملف', err.message || 'تأكد أن الملف هو نفس ملف التصدير.');
            setTimeout(() => {
                setImporting(false);
                setImportStage('idle');
                setImportFileName('');
            }, 1500);
        } finally {
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const progressPercent = importTotal > 0 ? Math.round((importProgress / importTotal) * 100) : 0;
    const stageText = {
        idle: '',
        reading: 'جاري قراءة ملف Excel...',
        checking: 'جاري تدقيق الأعمدة والمنتجات...',
        importing: `جاري تحديث المنتجات ${importProgress} / ${importTotal}`,
        syncing: 'جاري مزامنة الكتالوج...',
        done: 'تم الاستيراد بنجاح',
        error: 'تعذر إكمال الاستيراد'
    }[importStage];

    return (
        <div className="space-y-6 animate-fade-in">
            {importing && (
                <div className="fixed inset-0 z-[1200] bg-[#0e3c63]/50 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-white/40 p-8 text-center animate-fade-in">
                        <div className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-xl ${importStage === 'done' ? 'bg-emerald-500 text-white' : importStage === 'error' ? 'bg-red-500 text-white' : 'bg-[#0e3c63] text-white'}`}>
                            {importStage === 'done' ? <CheckCircle2 size={42} /> : importStage === 'error' ? <AlertTriangle size={42} /> : <Loader2 className="animate-spin" size={42} />}
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 mb-2">{stageText}</h3>
                        <p className="text-xs font-bold text-gray-400 mb-6 truncate">{importFileName}</p>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${importStage === 'done' ? 'bg-emerald-500' : importStage === 'error' ? 'bg-red-500' : 'bg-[#0e3c63]'}`}
                                style={{ width: `${importStage === 'reading' || importStage === 'checking' ? 18 : importStage === 'syncing' ? 96 : importStage === 'done' ? 100 : progressPercent}%` }}
                            />
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-2 text-xs font-black text-gray-400">
                            <FileSpreadsheet size={15} />
                            {importStage === 'importing' ? `${progressPercent}%` : importStage === 'done' ? 'جاهز' : 'يرجى الانتظار'}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#0e3c63] text-white flex items-center justify-center shadow-lg">
                        <FileSpreadsheet size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-gray-800">تصدير واستيراد {familyLabel}</h3>
                        <p className="text-xs font-bold text-gray-400 mt-1">اختَر قسم المنتجات، ثم صدّر ملفه وعدّل أسعار المفرد فقط.</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button onClick={exportExcel} className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black">
                        <Download size={18} /> تصدير Excel
                    </Button>
                    <Button onClick={exportPdf} className="h-12 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black">
                        <FileText size={18} /> تصدير PDF
                    </Button>
                    <input
                        ref={inputRef}
                        name="product-import"
                        aria-label="ملف استيراد المنتجات"
                        type="file"
                        className="hidden"
                        accept=".xls,.xml,.html,.csv,.tsv,text/xml,text/html,text/csv"
                        onChange={event => {
                            const file = event.target.files?.[0];
                            if (file) handleImportFile(file);
                        }}
                    />
                    <Button
                        disabled={!canEdit || importing}
                        onClick={() => inputRef.current?.click()}
                        className="h-12 bg-[#0e3c63] text-white rounded-2xl font-black disabled:opacity-50"
                    >
                        {importing ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                        {importing ? 'جاري الاستيراد...' : 'اختيار ملف واستيراد'}
                    </Button>
                </div>
            </div>

            {lastImportSummary && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl px-5 py-4 flex items-center gap-3 font-black text-sm">
                    <CheckCircle2 size={20} />
                    تم تحديث {lastImportSummary.updated} منتج، وتخطي {lastImportSummary.skipped} صف.
                </div>
            )}

            <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl px-5 py-4 flex items-start gap-3 font-bold text-sm leading-7">
                <AlertTriangle size={20} className="shrink-0 mt-1" />
                {typeFilter === 'PAINT' ? 'أدخل اسم المادة ونوع الصبغ والوزن وسعر السطلة للعادي وVIP. الأصباغ تباع بالسطلة مباشرة.' : typeFilter === 'ADHESIVE'
                    ? 'أدخل عدد الأكياس في الباليت وسعر الكيس للعادي وVIP فقط. سعر الباليت ينحسب تلقائياً من سعر الكيس × العدد.'
                    : 'اختَر طريقة البيع: كارتون أو قطعة. للكارتون أدخل مجموع الأمتار وسعر المتر؛ سعر الكارتون يحسب تلقائياً. للقطعة أدخل سعر القطعة واترك أمتار الكارتون صفر.'}
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-4 items-center">
                    <div className="relative">
                        <input
                            type="search"
                            name="product-search"
                            aria-label="بحث المنتجات"
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder="بحث بالكود، التصنيف، الابعاد..."
                            className="w-full h-13 bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-5 text-sm font-bold outline-none focus:bg-white focus:border-[#0e3c63]"
                        />
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-2xl p-1.5">
                        <Filter size={16} className="text-gray-400 mr-2" />
                        {[
                            { value: 'STYROFOAM', label: 'فلين' },
                            { value: 'ADHESIVE', label: 'مادة لاصقة' },
                            { value: 'PAINT', label: 'أصباغ' },
                        ].map(option => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => { setTypeFilter(option.value as ProductFamily); setCategoryFilter('ALL'); setLastImportSummary(null); }}
                                disabled={importing}
                                aria-pressed={typeFilter === option.value}
                                className={`h-10 px-4 rounded-xl text-xs font-black transition-all ${typeFilter === option.value ? 'bg-white text-[#0e3c63] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <select
                        name="product-category"
                        aria-label="تصنيف المنتجات"
                        value={categoryFilter}
                        onChange={event => setCategoryFilter(event.target.value)}
                        className="h-13 bg-gray-50 border border-gray-100 rounded-2xl px-5 text-sm font-black text-gray-600 outline-none focus:border-[#0e3c63]"
                    >
                        <option value="ALL">كل التصنيفات</option>
                        {categories.filter(category => category.type === typeFilter).map(category => (
                            <option key={category.id} value={category.name}>{category.name}</option>
                        ))}
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-right text-sm">
                        <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase">
                            <tr>
                                {fields.map(field => (
                                    <th key={field} className="p-4 whitespace-nowrap">{fieldLabels[field]}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {visibleRows.map(row => (
                                <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                                    {fields.map(field => (
                                        <td key={field} className={`p-4 whitespace-nowrap font-bold ${field.includes('vip') ? 'text-[#0e3c63]' : ''}`}>
                                            {field === 'code' ? <span className="font-mono font-black text-[#0e3c63]">{row[field]}</span> : row[field]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {filteredRows.length === 0 && (
                                <tr>
                                    <td colSpan={fields.length} className="p-12 text-center text-gray-400 font-black">لا توجد منتجات مطابقة للفلتر</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredRows.length > 0 && (
                    <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3 text-xs font-black text-gray-500">
                            <span>عرض</span>
                            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
                                {[50, 100, 200, 'ALL'].map(option => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => setRowsPerPage(option as number | 'ALL')}
                                        className={`h-10 px-4 rounded-xl transition-all ${rowsPerPage === option ? 'bg-[#0e3c63] text-white shadow-md' : 'text-gray-400 hover:text-[#0e3c63] hover:bg-blue-50'}`}
                                    >
                                        {option === 'ALL' ? 'الكل' : option}
                                    </button>
                                ))}
                            </div>
                            <span>
                                {visibleStart} - {visibleEnd} من <span className="text-gray-800">{filteredRows.length}</span> منتج
                            </span>
                        </div>

                        {rowsPerPage !== 'ALL' && (
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage(prev => Math.max(0, prev - 1))}
                                    disabled={page === 0}
                                    className="w-11 h-11 rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-[#0e3c63] hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-500 transition-all flex items-center justify-center"
                                >
                                    <ChevronRight size={18} />
                                </button>
                                <div className="min-w-[120px] h-11 px-5 rounded-xl bg-white border border-gray-200 text-[#0e3c63] font-black text-sm flex items-center justify-center shadow-sm">
                                    صفحة {page + 1} / {totalPages}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="w-11 h-11 rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-[#0e3c63] hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-500 transition-all flex items-center justify-center"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
