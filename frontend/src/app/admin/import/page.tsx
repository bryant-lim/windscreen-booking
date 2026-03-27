'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { UploadCloud, CheckCircle, Database } from 'lucide-react';
import Header from '@/components/Header';

export default function AdminImport() {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'uploading' | 'success' | 'error'>('idle');
  const [targetCollection, setTargetCollection] = useState<'vehicle-datas' | 'branch-datas'>('vehicle-datas');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('parsing');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setUploadStatus('idle');
      },
      error: (error) => {
        setErrorMessage(error.message);
        setUploadStatus('error');
      }
    });
  };

  const syncToDatabase = async () => {
    if (csvData.length === 0) return;
    setUploadStatus('uploading');
    setErrorMessage('');

    let successCount = 0;
    try {
      for (const row of csvData) {
        
        let payload: any = {};
        
        if (targetCollection === 'vehicle-datas') {
           // Provide massive fallback support for different header naming & empty cells
           const rawPrice = String(row['Price – Original'] || row['Price - Original'] || row['Price_Original'] || row['Price'] || '0');
           const cleanPrice = rawPrice.replace(/[^0-9.-]+/g, "");
           const parsedPrice = parseFloat(cleanPrice);

           payload = {
             Make: String(row['Make'] || ''),
             Model: String(row['Model'] || ''),
             Year: String(row['Year'] || ''),
             Part: String(row['Part'] || ''),
             Spec_Variant: String(row['Spec & Variant'] || row['Spec_Variant'] || ''),
             Price_Original: isNaN(parsedPrice) || cleanPrice === '' ? 0 : parsedPrice,
             Deposit_Required: String(row['Deposit Required'] || row['Deposit_Required'] || '').trim().toUpperCase() === 'Y'
           };
        } else {
           // Handle Branch Data logic (mapping excel headers to Strapi keys)
           payload = { ...row }; 
        }

        const response = await fetch(`http://localhost:1338/api/${targetCollection}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': 'Bearer YOUR_API_TOKEN_HERE' 
          },
          body: JSON.stringify({ data: payload })
        });

        if (!response.ok) {
           const err = await response.json();
           throw new Error(`Failed to upload row ${successCount + 1}: ${err.error?.message || 'Unknown error'}`);
        }
        successCount++;
      }
      setUploadStatus('success');
    } catch (err: any) {
      setErrorMessage(err.message + ` (Successfully uploaded ${successCount} rows before failing)`);
      setUploadStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-poppins">
      <Header />
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1e3a5f]">Data Importer</h1>
            <p className="text-slate-500 mt-2">Sync CSV spreadsheets directly into the Strapi MySQL Backend</p>
          </div>
          <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg text-sm border border-blue-100 flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span className="font-semibold">Local Environment (1338)</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Target Collection</label>
            <select 
              value={targetCollection}
              onChange={(e) => setTargetCollection(e.target.value as any)}
              className="border-slate-300 rounded-lg p-3 bg-slate-50 border w-64 outline-none focus:border-[#f5a623]"
            >
              <option value="vehicle-datas">Vehicle Data (Pricing)</option>
              <option value="branch-datas">Branch Data (Locations)</option>
            </select>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:border-[#1e3a5f] hover:bg-slate-50 transition-colors">
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden" 
              id="csv-upload" 
            />
            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
              <UploadCloud className="w-12 h-12 text-[#1e3a5f] mb-4" />
              <span className="text-lg font-semibold text-slate-700">Click to upload your CSV file</span>
              <span className="text-slate-400 mt-1">Make sure headers match your Excel template</span>
            </label>
          </div>

          {csvData.length > 0 && (
            <div className="mt-8 border border-[#1e3a5f]/20 rounded-lg overflow-hidden">
               <div className="bg-[#1e3a5f] text-white px-4 py-3 flex justify-between items-center">
                  <span className="font-semibold">Preview: Found {csvData.length} records</span>
                  <button 
                    onClick={() => setCsvData([])} 
                    className="text-white/80 hover:text-white underline text-sm"
                  >
                    Clear Data
                  </button>
               </div>
               <div className="max-h-64 overflow-y-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        {Object.keys(csvData[0] || {}).map(key => (
                          <th key={key} className="px-4 py-2 text-slate-600">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-4 py-2 text-slate-800">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                 </table>
                 {csvData.length > 5 && (
                    <div className="text-center p-3 text-slate-500 bg-slate-50 border-t border-slate-200 text-xs">
                       Showing first 5 rows of {csvData.length}
                    </div>
                 )}
               </div>

               <div className="p-4 bg-white border-t flex flex-col items-end">
                  {uploadStatus === 'error' && (
                     <div className="text-red-600 mb-3 text-sm font-semibold p-3 bg-red-50 rounded-lg w-full">
                       Error: {errorMessage}. (Did you enable Strapi Public 'Create' permissions?)
                     </div>
                  )}
                  {uploadStatus === 'success' && (
                     <div className="text-green-600 mb-3 text-sm font-semibold flex items-center gap-2">
                       <CheckCircle className="w-5 h-5" /> Import completed successfully!
                     </div>
                  )}
                  
                  <button
                    onClick={syncToDatabase}
                    disabled={uploadStatus === 'uploading' || uploadStatus === 'success'}
                    className="bg-[#f5a623] hover:bg-[#e09214] text-white px-8 py-3 rounded-lg font-bold transition-all disabled:bg-slate-300 disabled:cursor-not-allowed shadow-md"
                  >
                    {uploadStatus === 'uploading' ? 'Syncing to Database...' : 'Start Data Sync'}
                  </button>
               </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
