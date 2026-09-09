/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useRef } from 'react';
import { PharmacyCard, Language, CustomCardEdit } from '@/types/pharmacy';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import {
  X,
  Save,
  Plus,
  Trash2,
  Image as ImageIcon,
  Table as TableIcon,
  Eye,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Layers,
  Check,
} from 'lucide-react';

interface EditModalProps {
  card: PharmacyCard | null;
  language: Language;
  customEdit?: CustomCardEdit;
  onSave: (id: string, edit: CustomCardEdit) => void;
  onClose: () => void;
}

interface CellData {
  text: string;
  image?: string;
}

interface TableData {
  headers: CellData[];
  rows: CellData[][];
}

// Extract base text, images list, and table structure from HTML
function parseCardContent(html: string): {
  baseHtml: string;
  images: string[];
  tableData: TableData | null;
} {
  if (typeof window === 'undefined' || !html) {
    return { baseHtml: html || '', images: [], tableData: null };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. Extract standalone attached images
    const images: string[] = [];
    const imageNodes = doc.querySelectorAll('.topic-image-item img, .topic-attached-container img');
    imageNodes.forEach((img) => {
      const src = img.getAttribute('src');
      if (src && !images.includes(src)) {
        images.push(src);
      }
    });

    // 2. Extract Table
    const tableEl = doc.querySelector('table');
    let tableData: TableData | null = null;

    if (tableEl) {
      const thEls = tableEl.querySelectorAll('th');
      const headers: CellData[] = [];
      thEls.forEach((th) => {
        const img = th.querySelector('img');
        const imgSrc = img ? img.getAttribute('src') || '' : '';
        const clone = th.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('img').forEach((i) => i.remove());
        headers.push({
          text: clone.textContent?.trim() || '',
          image: imgSrc || undefined,
        });
      });

      const trEls = tableEl.querySelectorAll('tr');
      const rows: CellData[][] = [];
      trEls.forEach((tr) => {
        if (tr.querySelector('th')) return;
        const tdEls = tr.querySelectorAll('td');
        if (tdEls.length === 0) return;

        const rowCells: CellData[] = [];
        tdEls.forEach((td) => {
          const img = td.querySelector('img');
          const imgSrc = img ? img.getAttribute('src') || '' : '';
          const clone = td.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('img').forEach((i) => i.remove());
          rowCells.push({
            text: clone.textContent?.trim() || '',
            image: imgSrc || undefined,
          });
        });
        rows.push(rowCells);
      });

      if (headers.length > 0 || rows.length > 0) {
        tableData = {
          headers: headers.length > 0 ? headers : [{ text: 'عنوان ۱' }, { text: 'عنوان ۲' }],
          rows: rows.length > 0 ? rows : [[{ text: '' }, { text: '' }]],
        };
      }
    }

    // 3. Clean base HTML
    if (tableEl) tableEl.remove();
    doc.querySelectorAll('.topic-attached-container, .topic-image-item').forEach((el) => el.remove());

    const baseHtml = doc.body.innerHTML.trim();
    return { baseHtml, images, tableData };
  } catch (err) {
    console.error('Error parsing card content:', err);
    return { baseHtml: html, images: [], tableData: null };
  }
}

// Convert state back into unified HTML
function serializeToHtml(baseHtml: string, images: string[], tableData: TableData | null): string {
  let result = baseHtml;

  // Append attached images
  if (images.length > 0) {
    const imagesHtml = images
      .map(
        (src) =>
          `<div class="my-3 text-center topic-image-item"><img src="${src}" alt="تصویر سرفصل" class="max-w-full rounded-2xl border border-slate-300 dark:border-slate-700 shadow-md inline-block max-h-80 object-contain" /></div>`
      )
      .join('');
    result += `\n<div class="topic-attached-container my-3 space-y-3">${imagesHtml}</div>`;
  }

  // Append Table
  if (tableData) {
    const headersHtml = tableData.headers
      .map((h) => {
        const imgHtml = h.image
          ? `<div class="my-1 text-center"><img src="${h.image}" alt="cell image" class="max-h-24 max-w-full my-1 rounded border border-slate-300 dark:border-slate-700 object-contain mx-auto inline-block" /></div>`
          : '';
        return `<th class="p-2.5 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-bold text-center">${h.text}${imgHtml}</th>`;
      })
      .join('');

    const rowsHtml = tableData.rows
      .map((row) => {
        const cellsHtml = row
          .map((cell) => {
            const imgHtml = cell.image
              ? `<div class="my-1.5 text-center"><img src="${cell.image}" alt="cell image" class="max-h-28 max-w-full my-1 rounded border border-slate-300 dark:border-slate-700 object-contain mx-auto inline-block" /></div>`
              : '';
            return `<td class="p-2 border border-slate-300 dark:border-slate-700 align-top">${cell.text}${imgHtml}</td>`;
          })
          .join('');
        return `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">${cellsHtml}</tr>`;
      })
      .join('');

    const tableHtml = `<div class="overflow-x-auto my-3"><table class="w-full text-xs border-collapse border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden"><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
    result += `\n${tableHtml}`;
  }

  return result.trim();
}

export const EditModal: React.FC<EditModalProps> = ({
  card,
  language,
  customEdit,
  onSave,
  onClose,
}) => {
  const isFa = language === 'fa';

  const [activeTab, setActiveTab] = useState<'images' | 'table' | 'preview'>('images');

  // Load initial HTML
  const initialHtml = customEdit?.summary || (card ? card.detailsHtml[language] : '');
  const parsed = parseCardContent(initialHtml);

  const [baseHtml] = useState(parsed.baseHtml);
  const [images, setImages] = useState<string[]>(parsed.images);
  const [tableData, setTableData] = useState<TableData | null>(parsed.tableData);

  // New Image inputs
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cell image picker modal state
  const [cellImagePicker, setCellImagePicker] = useState<{
    isHeader: boolean;
    rowIndex: number;
    colIndex: number;
  } | null>(null);
  const [cellImageUrlInput, setCellImageUrlInput] = useState('');
  const cellFileInputRef = useRef<HTMLInputElement>(null);

  if (!card) return null;

  const handleSave = () => {
    const finalHtml = serializeToHtml(baseHtml, images, tableData);
    onSave(card.id, { summary: sanitizeHtml(finalHtml) });
    onClose();
  };

  // --- Image Handlers ---
  const handleAddImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setImages((prev) => [...prev, imageUrlInput.trim()]);
      setImageUrlInput('');
      setIsAddingUrl(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  // --- Table Handlers ---
  const handleAddTable = () => {
    setTableData({
      headers: [{ text: isFa ? 'ستون اول' : 'Column 1' }, { text: isFa ? 'ستون دوم' : 'Column 2' }],
      rows: [
        [{ text: '' }, { text: '' }],
        [{ text: '' }, { text: '' }],
      ],
    });
  };

  const handleDeleteTable = () => {
    setTableData(null);
  };

  const handleAddRow = () => {
    if (!tableData) return;
    const newRow: CellData[] = tableData.headers.map(() => ({ text: '' }));
    setTableData({ ...tableData, rows: [...tableData.rows, newRow] });
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (!tableData) return;
    const updatedRows = tableData.rows.filter((_, idx) => idx !== rowIndex);
    setTableData({ ...tableData, rows: updatedRows });
  };

  const handleAddColumn = () => {
    if (!tableData) return;
    const newHeader: CellData = { text: isFa ? `ستون ${tableData.headers.length + 1}` : `Col ${tableData.headers.length + 1}` };
    const updatedHeaders = [...tableData.headers, newHeader];
    const updatedRows = tableData.rows.map((row) => [...row, { text: '' }]);
    setTableData({ headers: updatedHeaders, rows: updatedRows });
  };

  const handleDeleteColumn = (colIndex: number) => {
    if (!tableData || tableData.headers.length <= 1) return;
    const updatedHeaders = tableData.headers.filter((_, idx) => idx !== colIndex);
    const updatedRows = tableData.rows.map((row) => row.filter((_, idx) => idx !== colIndex));
    setTableData({ headers: updatedHeaders, rows: updatedRows });
  };

  const handleUpdateCellText = (isHeader: boolean, rowIndex: number, colIndex: number, text: string) => {
    if (!tableData) return;
    if (isHeader) {
      const updatedHeaders = [...tableData.headers];
      updatedHeaders[colIndex] = { ...updatedHeaders[colIndex], text };
      setTableData({ ...tableData, headers: updatedHeaders });
    } else {
      const updatedRows = [...tableData.rows];
      const updatedRow = [...updatedRows[rowIndex]];
      updatedRow[colIndex] = { ...updatedRow[colIndex], text };
      updatedRows[rowIndex] = updatedRow;
      setTableData({ ...tableData, rows: updatedRows });
    }
  };

  const handleUpdateCellImage = (isHeader: boolean, rowIndex: number, colIndex: number, imageSrc: string) => {
    if (!tableData) return;
    if (isHeader) {
      const updatedHeaders = [...tableData.headers];
      updatedHeaders[colIndex] = { ...updatedHeaders[colIndex], image: imageSrc };
      setTableData({ ...tableData, headers: updatedHeaders });
    } else {
      const updatedRows = [...tableData.rows];
      const updatedRow = [...updatedRows[rowIndex]];
      updatedRow[colIndex] = { ...updatedRow[colIndex], image: imageSrc };
      updatedRows[rowIndex] = updatedRow;
      setTableData({ ...tableData, rows: updatedRows });
    }
  };

  const handleRemoveCellImage = (isHeader: boolean, rowIndex: number, colIndex: number) => {
    if (!tableData) return;
    if (isHeader) {
      const updatedHeaders = [...tableData.headers];
      const { image, ...rest } = updatedHeaders[colIndex];
      updatedHeaders[colIndex] = rest;
      setTableData({ ...tableData, headers: updatedHeaders });
    } else {
      const updatedRows = [...tableData.rows];
      const updatedRow = [...updatedRows[rowIndex]];
      const { image, ...rest } = updatedRow[colIndex];
      updatedRow[colIndex] = rest;
      updatedRows[rowIndex] = updatedRow;
      setTableData({ ...tableData, rows: updatedRows });
    }
  };

  const handleCellFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && cellImagePicker) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleUpdateCellImage(
            cellImagePicker.isHeader,
            cellImagePicker.rowIndex,
            cellImagePicker.colIndex,
            event.target.result as string
          );
          setCellImagePicker(null);
          setCellImageUrlInput('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="app-card border app-border p-4 sm:p-6 rounded-3xl max-w-3xl w-full space-y-4 shadow-2xl text-xs my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b app-border pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold app-text text-sm sm:text-base">
                {isFa ? 'افزودن عکس و جدول به سرفصل' : 'Add Image & Table to Topic'}
              </h3>
              <p className="text-[11px] app-muted">
                {card.title[language]}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-xl border app-border app-muted hover:app-text hover:bg-black/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-2 border-b app-border pb-2 shrink-0">
          <button
            onClick={() => setActiveTab('images')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
              activeTab === 'images'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'app-muted hover:app-text hover:bg-black/20'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>{isFa ? '📷 مدیریت عکس‌ها' : 'Images'}</span>
            {images.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                {images.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
              activeTab === 'table'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'app-muted hover:app-text hover:bg-black/20'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>{isFa ? '📊 مدیریت جدول' : 'Table'}</span>
            {tableData && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'app-muted hover:app-text hover:bg-black/20'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{isFa ? '👁️ پیش‌نمایش' : 'Preview'}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* TAB 1: IMAGES */}
          {activeTab === 'images' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-black/10 border app-border space-y-3">
                <h4 className="font-bold app-text text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>{isFa ? 'افزودن تصویر جدید به سرفصل:' : 'Add New Image:'}</span>
                </h4>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* File Upload Button */}
                  <label className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-2 shadow-md shadow-purple-600/20">
                    <Upload className="w-4 h-4" />
                    <span>{isFa ? 'انتخاب عکس از فایل دستگاه' : 'Upload File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleAddImageFile}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={() => setIsAddingUrl(!isAddingUrl)}
                    className="px-4 py-2 rounded-xl border app-border app-text hover:bg-black/20 font-bold text-xs transition flex items-center gap-2"
                  >
                    <LinkIcon className="w-4 h-4 text-sky-400" />
                    <span>{isFa ? 'وارد کردن لینک عکس (URL)' : 'Add Image URL'}</span>
                  </button>
                </div>

                {isAddingUrl && (
                  <div className="flex items-center gap-2 pt-2 animate-fadeIn">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="https://example.com/image.png"
                      className="flex-1 app-bg border app-border p-2.5 rounded-xl app-text text-xs focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={handleAddImageUrl}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shrink-0"
                    >
                      {isFa ? 'ثبت عکس' : 'Add'}
                    </button>
                  </div>
                )}
              </div>

              {/* Images Gallery */}
              <div className="space-y-2">
                <label className="app-muted block font-bold text-xs">
                  {isFa ? 'تصاویر ثبت‌شده در این سرفصل:' : 'Attached Images:'}
                </label>

                {images.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {images.map((imgSrc, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-2xl border app-border bg-black/20 p-2 overflow-hidden flex flex-col items-center justify-center space-y-2"
                      >
                        <img
                          src={imgSrc}
                          alt={`attached ${idx}`}
                          className="max-h-44 w-full object-contain rounded-xl"
                        />
                        <button
                          onClick={() => handleRemoveImage(idx)}
                          className="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 rounded-xl text-[11px] font-bold transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isFa ? 'حذف این عکس' : 'Delete Image'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed app-border text-center app-muted space-y-1">
                    <ImageIcon className="w-8 h-8 mx-auto opacity-40 mb-2" />
                    <p className="font-bold text-xs">{isFa ? 'هنوز هیچ تصوری به این سرفصل اضافه نشده است.' : 'No images added yet.'}</p>
                    <p className="text-[10px] text-purple-400">{isFa ? 'با دکمه بالا می‌توانید عکس‌های تشخیصی یا نموداری اضافه کنید.' : 'Upload diagram or clinical images.'}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TABLE */}
          {activeTab === 'table' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-bold app-text text-xs">
                    {isFa ? 'ساختار جدول سرفصل:' : 'Topic Table Structure:'}
                  </h4>
                  <p className="text-[10px] app-muted">
                    {isFa ? 'می‌توانید به هر سلول متن و تصویر اختصاص دهید.' : 'Add text & cell images to any cell.'}
                  </p>
                </div>

                {tableData ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={handleAddRow}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isFa ? 'افزودن سطر' : 'Add Row'}</span>
                    </button>

                    <button
                      onClick={handleAddColumn}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isFa ? 'افزودن ستون' : 'Add Column'}</span>
                    </button>

                    <button
                      onClick={handleDeleteTable}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition flex items-center gap-1 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isFa ? 'حذف جدول' : 'Delete Table'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleAddTable}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isFa ? '➕ ایجاد جدول جدید برای این سرفصل' : 'Create New Table'}</span>
                  </button>
                )}
              </div>

              {/* Table Interactive Grid */}
              {tableData ? (
                <div className="overflow-x-auto border app-border rounded-2xl bg-black/20 p-2 space-y-2">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        {tableData.headers.map((headerCell, colIdx) => (
                          <th key={colIdx} className="p-2 border app-border bg-black/40 min-w-[140px] align-top">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-mono text-sky-400">
                                  {isFa ? `ستون ${colIdx + 1}` : `Col ${colIdx + 1}`}
                                </span>
                                {tableData.headers.length > 1 && (
                                  <button
                                    onClick={() => handleDeleteColumn(colIdx)}
                                    className="text-rose-400 hover:text-rose-300 p-0.5"
                                    title={isFa ? 'حذف ستون' : 'Delete Column'}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              <input
                                type="text"
                                value={headerCell.text}
                                onChange={(e) => handleUpdateCellText(true, 0, colIdx, e.target.value)}
                                className="w-full bg-black/40 border app-border p-1.5 rounded-lg app-text text-center font-bold text-xs focus:outline-none focus:border-sky-500"
                                placeholder={isFa ? 'عنوان ستون' : 'Header Title'}
                              />

                              {/* Cell Image Badge/Button */}
                              <div className="flex items-center justify-center gap-1 pt-0.5">
                                {headerCell.image ? (
                                  <div className="relative group inline-block">
                                    <img
                                      src={headerCell.image}
                                      alt="header cell"
                                      className="w-10 h-10 object-cover rounded border border-sky-400/50"
                                    />
                                    <button
                                      onClick={() => handleRemoveCellImage(true, 0, colIdx)}
                                      className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 shadow hover:scale-110"
                                      title={isFa ? 'حذف عکس' : 'Delete image'}
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setCellImagePicker({ isHeader: true, rowIndex: 0, colIndex: colIdx })}
                                    className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition flex items-center gap-1"
                                  >
                                    <ImageIcon className="w-2.5 h-2.5" />
                                    <span>+ 📷</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </th>
                        ))}
                        <th className="p-2 w-8"></th>
                      </tr>
                    </thead>

                    <tbody>
                      {tableData.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-t app-border">
                          {row.map((cell, colIdx) => (
                            <td key={colIdx} className="p-2 border app-border align-top min-w-[140px]">
                              <div className="space-y-1.5">
                                <textarea
                                  rows={2}
                                  value={cell.text}
                                  onChange={(e) => handleUpdateCellText(false, rowIdx, colIdx, e.target.value)}
                                  className="w-full bg-black/20 border app-border p-1.5 rounded-lg app-text text-xs focus:outline-none focus:border-sky-500"
                                  placeholder={isFa ? 'متن سلول' : 'Cell text'}
                                />

                                {/* Cell Image Control */}
                                <div className="flex items-center justify-between gap-1 text-[10px]">
                                  {cell.image ? (
                                    <div className="relative group flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-purple-500/40 w-full">
                                      <img
                                        src={cell.image}
                                        alt="cell"
                                        className="w-8 h-8 object-cover rounded border border-app-border shrink-0"
                                      />
                                      <span className="text-[9px] text-purple-300 font-mono truncate flex-1">
                                        {isFa ? 'تصویر سلول' : 'Cell Image'}
                                      </span>
                                      <button
                                        onClick={() => handleRemoveCellImage(false, rowIdx, colIdx)}
                                        className="text-rose-400 hover:text-rose-300 p-1"
                                        title={isFa ? 'حذف عکس' : 'Delete image'}
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setCellImagePicker({ isHeader: false, rowIndex: rowIdx, colIndex: colIdx })}
                                      className="text-[10px] px-2 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 transition flex items-center gap-1 w-full justify-center"
                                    >
                                      <ImageIcon className="w-3 h-3" />
                                      <span>{isFa ? '📷 عکس به سلول' : 'Cell Image'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          ))}

                          <td className="p-2 text-center align-middle">
                            <button
                              onClick={() => handleDeleteRow(rowIdx)}
                              className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition"
                              title={isFa ? 'حذف سطر' : 'Delete Row'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-dashed app-border text-center text-xs app-muted space-y-1">
                  <TableIcon className="w-8 h-8 mx-auto opacity-40 mb-2" />
                  <p>{isFa ? 'هیچ جدولی برای این سرفصل اضافه نشده است.' : 'No table exists for this card.'}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-3 p-4 rounded-2xl border app-border bg-black/10">
              <div className="border-b app-border pb-2">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                  {isFa ? 'پیش‌نمایش خروجی سرفصل:' : 'Rendered Output Preview:'}
                </span>
                <h3 className="text-sm font-bold app-text mt-1">{card.title[language]}</h3>
              </div>

              <div
                className="app-text text-xs leading-relaxed space-y-2 overflow-x-auto pt-2"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(serializeToHtml(baseHtml, images, tableData)) }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t app-border shrink-0">
          <span className="text-[10px] app-muted font-mono hidden sm:inline-block">
            ID: {card.id}
          </span>

          <div className="flex items-center gap-2 mr-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border app-border app-muted hover:app-text text-xs transition"
            >
              {isFa ? 'انصراف' : 'Cancel'}
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
            >
              <Check className="w-4 h-4" />
              <span>{isFa ? 'اعمال عکس و جدول' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CELL IMAGE PICKER SUB-MODAL */}
      {cellImagePicker && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="app-card border app-border p-5 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b app-border pb-2">
              <h4 className="font-bold app-text text-xs flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>{isFa ? 'افزودن تصویر به سلول جدول' : 'Add Image to Table Cell'}</span>
              </h4>
              <button onClick={() => setCellImagePicker(null)} className="app-muted hover:app-text p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="app-muted block mb-1 font-bold">
                  {isFa ? '۱. آپلود تصویر از دستگاه (فایل):' : '1. Upload Image File:'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={cellFileInputRef}
                  onChange={handleCellFileUpload}
                  className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                />
              </div>

              <div className="text-center text-[10px] app-muted font-bold">- {isFa ? 'یا' : 'OR'} -</div>

              <div>
                <label className="app-muted block mb-1 font-bold">
                  {isFa ? '۲. وارد کردن لینک تصویر (URL):' : '2. Enter Image URL:'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={cellImageUrlInput}
                    onChange={(e) => setCellImageUrlInput(e.target.value)}
                    placeholder="https://example.com/image.png"
                    className="flex-1 bg-black/20 border app-border p-2 rounded-xl app-text text-xs focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => {
                      if (cellImageUrlInput.trim() && cellImagePicker) {
                        handleUpdateCellImage(
                          cellImagePicker.isHeader,
                          cellImagePicker.rowIndex,
                          cellImagePicker.colIndex,
                          cellImageUrlInput.trim()
                        );
                        setCellImagePicker(null);
                        setCellImageUrlInput('');
                      }
                    }}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shrink-0"
                  >
                    {isFa ? 'ثبت' : 'Apply'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t app-border flex justify-end">
              <button
                onClick={() => setCellImagePicker(null)}
                className="px-3 py-1.5 rounded-xl border app-border text-xs app-muted"
              >
                {isFa ? 'بستن' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
