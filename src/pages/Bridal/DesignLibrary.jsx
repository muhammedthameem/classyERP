import React, { useState, useEffect } from 'react';
import { Palette, Trash2, Download, Search, Image as ImageIcon, Eye, AlertCircle } from 'lucide-react';
import supabase from '../../supabase';

function DesignLibraryPage({ themeStyle, setCurrentPage, showGlobalToast, setEditingDesign }) {
  const [designs, setDesigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [designToDelete, setDesignToDelete] = useState(null);

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_config')
        .select('*')
        .like('id', 'design_%');

      if (error) {
        setErrorMsg(error.message || JSON.stringify(error));
        throw error;
      }
      
      const loadedDesigns = (data || [])
        .filter(row => row.id !== 'designations' && row.id.startsWith('design_'))
        .map(row => ({
          id: row.id,
          ...(row.data || {})
        })).sort((a, b) => {
          const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return dateB - dateA;
        });
      
      setDesigns(loadedDesigns);
      setErrorMsg('');
    } catch (err) {
      console.error('Error fetching designs:', err);
      setErrorMsg(err.message || 'Unknown error');
      if (showGlobalToast) showGlobalToast('Error', 'Failed to load design library.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDesign = async () => {
    if (!designToDelete) return;
    try {
      const { error } = await supabase.from('erp_config').delete().eq('id', designToDelete.id);
      if (error) throw error;
      setDesigns(prev => prev.filter(d => d.id !== designToDelete.id));
      if (showGlobalToast) showGlobalToast('Deleted', 'Design removed from library.');
      setDesignToDelete(null);
    } catch (err) {
      console.error('Error deleting design:', err);
      if (showGlobalToast) showGlobalToast('Error', 'Failed to delete design.');
      setDesignToDelete(null);
    }
  };

  const downloadDesign = (design) => {
    const link = document.createElement('a');
    link.download = `${(design.title || 'Untitled').replace(/\s+/g, '-')}.webp`;
    link.href = design.image;
    link.click();
  };

  const handleEdit = (design) => {
    setEditingDesign(design);
    setCurrentPage('create-design');
  };

  const filteredDesigns = designs.filter(d => 
    (d.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-300" style={themeStyle}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 flex items-center gap-3 text-[var(--text)]">
            <ImageIcon className="text-[var(--jewel)]" size={28} />
            Design Library
          </h1>
          <p className="text-para text-[var(--muted)] mt-1">Browse, edit, and manage your bridal sketches.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingDesign(null);
              setCurrentPage('create-design');
            }}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[var(--jewel)] hover:shadow-xl"
          >
            <Palette size={18} /> New Design
          </button>
        </div>
      </div>

      <div className="mb-8 flex items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search designs by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-11 pr-4 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--muted)]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)] mb-4"></div>
          <p className="font-semibold">Loading Library...</p>
        </div>
      ) : errorMsg ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-red-500/20 bg-red-500/10 py-20 text-center shadow-[var(--shadow)] backdrop-blur text-red-500">
          <h3 className="text-lg font-bold mb-2">Failed to load designs</h3>
          <p className="text-sm max-w-sm mb-4">{errorMsg}</p>
          <button onClick={fetchDesigns} className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-600">Retry</button>
        </div>
      ) : filteredDesigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-[var(--border)] bg-[var(--surface)] py-20 text-center shadow-[var(--shadow)] backdrop-blur">
          <ImageIcon size={48} className="text-[var(--muted)] opacity-50 mb-4" />
          <h3 className="text-lg font-bold text-[var(--text)] mb-2">No designs found</h3>
          <p className="text-sm text-[var(--muted)] mb-6 max-w-sm">
            {searchTerm ? 'Try adjusting your search criteria.' : "You haven't saved any custom designs yet. Start sketching to build your library."}
          </p>
          {!searchTerm && (
            <button
              onClick={() => {
                setEditingDesign(null);
                setCurrentPage('create-design');
              }}
              className="rounded-xl bg-[var(--accent-soft)] px-5 py-2.5 text-sm font-bold text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-white"
            >
              Create Your First Design
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDesigns.map((design) => (
            <div key={design.id} className="group overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] backdrop-blur transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="relative aspect-[1/1.414] w-full bg-white border-b border-[var(--border)] overflow-hidden">
                <img 
                  src={design.image} 
                  alt={design.title} 
                  className="h-full w-full object-contain p-2"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-3 backdrop-blur-sm">
                  <button
                    onClick={() => handleEdit(design)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition-transform hover:scale-110"
                    title="View & Edit"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => downloadDesign(design)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--text)] shadow-lg transition-transform hover:scale-110"
                    title="Download"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={() => setDesignToDelete(design)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-110"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-bold text-[var(--text)] truncate">{design.title || 'Untitled'}</h3>
                <p className="text-xs font-medium text-[var(--muted)] mt-1">
                  {design.timestamp ? new Date(design.timestamp).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  }) : 'Unknown date'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Theme Delete Modal */}
      {designToDelete && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <AlertCircle size={28} />
              </div>
              <h3 className="text-xl font-bold text-[var(--text)] mb-2">Delete Design?</h3>
              <p className="text-sm text-[var(--muted)] mb-6">
                Are you sure you want to permanently delete "{designToDelete.title || 'Untitled'}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDesignToDelete(null)}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition-all hover:bg-[var(--soft)]"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteDesign}
                  className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DesignLibraryPage;
