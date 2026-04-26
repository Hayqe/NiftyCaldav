import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Upload, X, Check, AlertCircle, FileText } from 'lucide-react';
import { icsApi } from '@/services/api';
import { useCalendarContext } from '@/context/CalendarContext';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ICSImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; errors: number; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { myCalendars, sharedCalendars } = useCalendarContext();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allCalendars = [...myCalendars, ...sharedCalendars];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validate file type
      if (file.name.endsWith('.ics') || file.type === 'text/calendar') {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Selecteer een geldig .ics bestand');
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCalendarSelect = (calendarId: number) => {
    setSelectedCalendarId(calendarId === selectedCalendarId ? null : calendarId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !selectedCalendarId) {
      setError('Selecteer een .ics bestand en een agenda');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setResult(null);

    let interval: ReturnType<typeof setInterval> | null = null;
    try {
      // Simulate progress
      interval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 90) {
            if (interval) clearInterval(interval);
            return 90;
          }
          return newProgress;
        });
      }, 200);

      const response = await icsApi.import(selectedCalendarId, selectedFile);
      if (interval) clearInterval(interval);
      setUploadProgress(100);
      setResult(response.data);
      
      // Reset after 5 seconds
      setTimeout(() => {
        setUploadProgress(0);
      }, 500);
      
    } catch (err) {
      if (interval) clearInterval(interval);
      setUploadProgress(0);
      if (err instanceof Error) {
        setError(err.message || 'Fout bij het importeren van het bestand');
      } else {
        setError('Fout bij het importeren van het bestand');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ICS Import</h1>
          <p className="text-gray-500">Import .ics bestanden naar je agenda</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bestand selecteren</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${result.errors > 0 ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
              {result.errors > 0 ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              <div>
                <p className="font-medium">{result.imported} events geimporteerd</p>
                {result.errors > 0 && (
                  <p className="text-sm">{result.errors} fouten opgetreden</p>
                )}
                {result.message && (
                  <p className="text-sm mt-1">{result.message}</p>
                )}
              </div>
            </div>
          )}

          {/* File upload area */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${selectedFile ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}`}
          >
            <div className="mb-4">
              <Upload className={`w-12 h-12 mx-auto ${selectedFile ? 'text-primary-600' : 'text-gray-400'}`} />
            </div>
            
            {selectedFile ? (
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <FileText className="w-5 h-5 text-primary-600" />
                    <span className="flex-1 mx-3 text-sm truncate">{selectedFile.name}</span>
                    <button
                      onClick={handleRemoveFile}
                      className="p-1 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  type="button"
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Andere bestanden selecteren
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-gray-900 mb-2">Sleep .ics bestand hierheen</h3>
                <p className="text-sm text-gray-500 mb-4">
                  of
                </p>
                <label className="inline-block">
                  <span className="btn btn-primary cursor-pointer">
                    Selecteer bestand
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ics,text/calendar"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-4">
                  Alleen .ics bestanden worden ondersteund
                </p>
              </>
            )}
          </div>
        </div>

        {/* Calendar Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Selecteer doela Agenda
          </h2>
          
          <p className="text-sm text-gray-500 mb-4">
            Kies de agenda waarnaar de events moeten worden geimporteerd
          </p>
          
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
            {allCalendars.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                Geen agenda's gevonden. Maak eerst een agenda aan.
              </p>
            ) : (
              allCalendars.map(calendar => {
                const isSelected = selectedCalendarId === calendar.id;
                return (
                  <button
                    key={calendar.id}
                    onClick={() => handleCalendarSelect(calendar.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-lg transition-colors text-left ${isSelected ? 'bg-primary-100 border border-primary-500' : 'hover:bg-gray-50 border border-transparent'}`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${isSelected ? 'border-primary-600 bg-primary-600' : 'border-gray-300'}`} />
                    <div>
                      <h3 className="font-medium text-gray-900">{calendar.name}</h3>
                      {calendar.description && (
                        <p className="text-sm text-gray-500">{calendar.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Eigenaar: {calendar.owner?.username || `ID: ${calendar.owner_id}`}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {isUploading ? (
          <div className="flex items-center gap-4">
            <LoadingSpinner size="md" />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Bestand aan het importeren...</h3>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-1">{uploadProgress}%</p>
            </div>
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || !selectedCalendarId || isUploading}
            className="btn btn-primary w-full"
          >
            Importeer naar geselecteerde agenda
          </button>
        )}
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          Dubbele events zullen worden genegeerd
        </p>
      </div>
    </div>
  );
}
