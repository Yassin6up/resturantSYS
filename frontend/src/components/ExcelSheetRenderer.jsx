import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  DocumentArrowDownIcon, 
  PlusIcon,
  TrashIcon,
  
  ArrowPathIcon ,
  ArrowDownCircleIcon
  
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const InteractiveExcelSheet = ({ data, columns, title, dateRange, onDataUpdate }) => {
  const [sheetData, setSheetData] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const editInputRef = useRef(null);

  // Initialize sheet data
  useEffect(() => {
    if (data && columns) {
      const initialData = [
        // Header row
        columns.map(col => col.header),
        // Data rows
        ...data.map((row, rowIndex) => 
          columns.map(col => col.render ? col.render(row, rowIndex) : row[col.key])
        )
      ];
      setSheetData(initialData);
      createWorkbook(initialData);
      setHasChanges(false);
    }
  }, [data, columns]);

  const createWorkbook = (dataToExport) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dataToExport);
    
    // Set column widths
    const colWidths = columns.map((col, index) => {
      let maxLength = col.header.length;
      dataToExport.slice(1).forEach(row => {
        const value = row[index];
        const length = value ? value.toString().length : 0;
        if (length > maxLength) {
          maxLength = length;
        }
      });
      return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, title || 'Report');
    setWorkbook(wb);
  };

  const startEditing = (rowIndex, colIndex, value) => {
    setEditingCell({ row: rowIndex, col: colIndex });
    setEditValue(value || '');
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, 10);
  };

  const stopEditing = () => {
    if (editingCell) {
      const { row, col } = editingCell;
      const newData = [...sheetData];
      
      // Update the cell value
      newData[row] = [...newData[row]];
      newData[row][col] = editValue;
      
      setSheetData(newData);
      setHasChanges(true);
      createWorkbook(newData);
      
      // Notify parent component of data changes
      if (onDataUpdate && row > 0) { // Don't update headers
        onDataUpdate(newData);
      }
    }
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      stopEditing();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      stopEditing();
      if (editingCell) {
        const nextCol = (editingCell.col + 1) % sheetData[0].length;
        const nextRow = editingCell.row + Math.floor((editingCell.col + 1) / sheetData[0].length);
        if (nextRow < sheetData.length) {
          startEditing(nextRow, nextCol, sheetData[nextRow][nextCol]);
        }
      }
    }
  };

  const addRow = () => {
    const newRow = Array(sheetData[0].length).fill('');
    const newData = [...sheetData, newRow];
    setSheetData(newData);
    setHasChanges(true);
    createWorkbook(newData);
    toast.success('New row added');
  };

  const deleteRow = (rowIndex) => {
    if (sheetData.length <= 1) {
      toast.error('Cannot delete all rows');
      return;
    }
    
    if (rowIndex === 0) {
      toast.error('Cannot delete header row');
      return;
    }

    const newData = sheetData.filter((_, index) => index !== rowIndex);
    setSheetData(newData);
    setHasChanges(true);
    createWorkbook(newData);
    toast.success('Row deleted');
  };

  const addColumn = () => {
    const newData = sheetData.map(row => [...row, '']);
    setSheetData(newData);
    setHasChanges(true);
    createWorkbook(newData);
    toast.success('New column added');
  };

  const deleteColumn = (colIndex) => {
    if (sheetData[0].length <= 1) {
      toast.error('Cannot delete all columns');
      return;
    }

    const newData = sheetData.map(row => row.filter((_, index) => index !== colIndex));
    setSheetData(newData);
    setHasChanges(true);
    createWorkbook(newData);
    toast.success('Column deleted');
  };

  const resetData = () => {
    const initialData = [
      columns.map(col => col.header),
      ...data.map((row, rowIndex) => 
        columns.map(col => col.render ? col.render(row, rowIndex) : row[col.key])
      )
    ];
    setSheetData(initialData);
    setHasChanges(false);
    createWorkbook(initialData);
    toast.success('Data reset to original');
  };

  const downloadExcel = () => {
    if (!workbook) return;

    try {
      XLSX.writeFile(workbook, `${title || 'report'}_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`);
      toast.success('Excel file downloaded successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      toast.error('Failed to download Excel file');
    }
  };

  const exportModifiedData = () => {
    // Convert sheet data back to structured format if needed
    const modifiedData = sheetData.slice(1).map((row, rowIndex) => {
      const rowData = {};
      columns.forEach((col, colIndex) => {
        rowData[col.key] = row[colIndex];
      });
      return rowData;
    });
    
    console.log('Modified Data:', modifiedData);
    toast.success('Modified data exported');
    
    // You can send this to an API or use it as needed
    if (onDataUpdate) {
      onDataUpdate(modifiedData);
    }
  };

  if (!sheetData.length || !data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No data available for Excel view
      </div>
    );
  }

  const headers = sheetData[0] || [];
  const rows = sheetData.slice(1) || [];

  return (
    <div className="space-y-4">
      {/* Excel Toolbar */}
      <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg border border-gray-300">
        <div className="flex items-center space-x-2">
          <button
            onClick={downloadExcel}
            className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            <span>Download Excel</span>
          </button>

          <button
            onClick={exportModifiedData}
            disabled={!hasChanges}
            className={`flex items-center space-x-2 px-3 py-2 rounded text-sm font-medium ${
              hasChanges 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <ArrowDownCircleIcon className="h-4 w-4" />
            <span>Save Changes</span>
          </button>

          <button
            onClick={resetData}
            className="flex items-center space-x-2 px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm font-medium"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>Reset</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={addRow}
            className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Row</span>
          </button>

          <button
            onClick={addColumn}
            className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Column</span>
          </button>
        </div>
      </div>

      {/* Excel-like Grid */}
      <div className="overflow-auto border border-gray-300 rounded-lg max-h-96">
        {/* Column Headers with Delete Buttons */}
        <div className="flex bg-gray-100 border-b border-gray-300 sticky top-0 z-10">
          <div className="w-12 bg-gray-200 border-r border-gray-300 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-600">#</span>
          </div>
          {headers.map((header, colIndex) => (
            <div
              key={colIndex}
              className="flex-1 px-4 py-3 text-sm font-semibold text-white border-r border-gray-300 last:border-r-0 relative group"
              style={{ 
                minWidth: '150px',
                backgroundColor: '#2E5BFF'
              }}
            >
              {editingCell?.row === 0 && editingCell?.col === colIndex ? (
                <input
                  ref={editInputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={stopEditing}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-white text-gray-900 px-1 py-0.5 text-sm border border-blue-500 rounded"
                />
              ) : (
                <div
                  className="cursor-pointer hover:bg-blue-600 px-2 py-1 rounded"
                  onClick={() => startEditing(0, colIndex, header)}
                  onDoubleClick={() => startEditing(0, colIndex, header)}
                >
                  {header}
                </div>
              )}
              <button
                onClick={() => deleteColumn(colIndex)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Delete column"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Data Rows with Row Numbers and Delete Buttons */}
        <div className="bg-white">
          {sheetData.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={`flex border-b border-gray-200 last:border-b-0 group ${
                rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              } ${rowIndex === 0 ? 'bg-blue-50' : ''}`}
            >
              {/* Row Number and Delete Button */}
              <div className="w-12 bg-gray-50 border-r border-gray-200 flex items-center justify-center relative">
                {rowIndex === 0 ? (
                  <span className="text-xs font-semibold text-gray-600">#</span>
                ) : (
                  <>
                    <span className="text-xs text-gray-500">{rowIndex}</span>
                    <button
                      onClick={() => deleteRow(rowIndex)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Delete row"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>

              {/* Data Cells */}
              {row.map((value, colIndex) => (
                <div
                  key={colIndex}
                  className="flex-1 px-4 py-3 text-sm text-gray-900 border-r border-gray-200 last:border-r-0 relative group"
                  style={{ minWidth: '150px' }}
                >
                  {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                    <input
                      ref={editInputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={stopEditing}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-white text-gray-900 px-2 py-1 text-sm border border-blue-500 rounded shadow-lg"
                      autoFocus
                    />
                  ) : (
                    <div
                      className={`cursor-cell hover:bg-blue-50 px-2 py-1 rounded min-h-6 ${
                        rowIndex === 0 ? 'font-semibold' : ''
                      }`}
                      onClick={() => startEditing(rowIndex, colIndex, value)}
                      onDoubleClick={() => startEditing(rowIndex, colIndex, value)}
                      title="Click to edit, double-click for quick edit"
                    >
                      {value || <span className="text-gray-400 italic">empty</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Excel Status Bar */}
      <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-100 p-2 rounded border border-gray-300">
        <div className="flex space-x-4">
          <span>Ready</span>
          <span>View: Normal</span>
          {hasChanges && (
            <span className="text-orange-600 font-semibold">● Unsaved changes</span>
          )}
        </div>
        <div className="flex space-x-4">
          <span>{rows.length} rows × {headers.length} columns</span>
          <span>Total cells: {sheetData.length * sheetData[0]?.length}</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">Editing Instructions:</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• <strong>Click</strong> any cell to select and edit</li>
          <li>• <strong>Double-click</strong> for quick editing</li>
          <li>• <strong>Enter</strong> to save, <strong>Escape</strong> to cancel</li>
          <li>• <strong>Tab</strong> to move to next cell</li>
          <li>• <strong>Hover</strong> over rows/columns to see delete buttons</li>
          <li>• Use toolbar buttons to add rows/columns</li>
        </ul>
      </div>
    </div>
  );
};

export default InteractiveExcelSheet;