const fs = require('fs');
let content = fs.readFileSync('src/pages/Clients/ClientDetail.jsx', 'utf8');

if (!content.includes('ImageIcon')) {
  content = content.replace(/import \{ /, 'import { ImageIcon, ');
}

content = content.replace(
  /const \[note, setNote\] = useState\(''\)/,
  `const [note, setNote] = useState('')\n  const [photoFile, setPhotoFile] = useState(null)\n  const [isUploading, setIsUploading] = useState(false)`
);

content = content.replace(
  /setIsAddingMeasurement\(false\)/g,
  `setIsAddingMeasurement(false)\n                    setPhotoFile(null)`
);
content = content.replace(
  /setClientDetailMode\('view'\)/g,
  `setClientDetailMode('view')\n                    setPhotoFile(null)`
);

const oldHandleSaveMeasurement = `  const handleSaveMeasurement = (e) => {
    e.preventDefault()

    if (isAddingMeasurement && client.measurements?.length > 0) {
      const existingMatch = client.measurements.find(m => m.product?.toLowerCase() === product.toLowerCase().trim());
      if (existingMatch) {
        setPendingMeasurementData({ product, topMeasurements, bottomMeasurements, note });
        setShowMergePopup(true);
        return; // Halt save process
      }
    }

    executeSaveMeasurement({ product, topMeasurements, bottomMeasurements, note });
  }`;

const newHandleSaveMeasurement = `  const handleSaveMeasurement = async (e) => {
    e.preventDefault()

    let photoUrl = null;
    if (photoFile) {
      setIsUploading(true);
      try {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = \`\${Date.now()}_\${Math.random().toString(36).substring(7)}.\${fileExt}\`;
        const { error } = await supabase.storage
          .from('measurements')
          .upload(fileName, photoFile);
          
        if (error) throw error;
        
        const { data } = supabase.storage
          .from('measurements')
          .getPublicUrl(fileName);
          
        photoUrl = data.publicUrl;
      } catch (err) {
        console.error('Error uploading photo:', err);
        if (showGlobalToast) showGlobalToast('Upload Failed', err.message || 'Could not upload measurement photo.');
      } finally {
        setIsUploading(false);
      }
    }

    if (isAddingMeasurement && client.measurements?.length > 0) {
      const existingMatch = client.measurements.find(m => m.product?.toLowerCase() === product.toLowerCase().trim());
      if (existingMatch) {
        setPendingMeasurementData({ product, topMeasurements, bottomMeasurements, note, photoUrl });
        setShowMergePopup(true);
        return; // Halt save process
      }
    }

    executeSaveMeasurement({ product, topMeasurements, bottomMeasurements, note, photoUrl });
  }`;

content = content.replace(oldHandleSaveMeasurement, newHandleSaveMeasurement);

content = content.replace(
  /executeSaveMeasurement = \(measurementToSave\) => {[\s\S]*?updatedClient\.measurements = \[\{([\s\S]*?)\}\]/,
  (match, p1) => match.replace(p1, p1.replace('note: updatedClient.note,', 'note: updatedClient.note,\n          photoUrl: updatedClient.photoUrl,'))
);

content = content.replace(
  /if \(isEditingClient && !isAddingMeasurement\) {[\s\S]*?note: measurementToSave\.note\n        }/,
  (match) => match.replace('note: measurementToSave.note', 'note: measurementToSave.note,\n          photoUrl: measurementToSave.photoUrl')
);

content = content.replace(
  /if \(isEditingClient && !isAddingMeasurement\) \{/,
  `if (!measurementToSave.photoUrl && isEditingClient && !isAddingMeasurement) {
        measurementToSave.photoUrl = client.measurements?.[selectedMeasurementIndex]?.photoUrl || client.photoUrl || null;
      }
      
      if (isEditingClient && !isAddingMeasurement) {`
);

content = content.replace(
  /\{currentMeasurement\.note && \(\n              <section className="rounded-\[24px\] border border-\[var\(--border\)\] bg-\[var\(--surface\)\] p-4 sm:p-6 shadow-\[var\(--shadow\)\] backdrop-blur\">\n                <h2 className="text-h2 mb-4 flex items-center gap-2\">\n                  <Settings size=\{20\} \/> Notes\n                <\/h2>/,
  `              <section className="flex-1 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 shadow-[var(--shadow)] backdrop-blur mb-6">
                <h2 className="text-h2 mb-4 flex items-center gap-2">
                  <ImageIcon size={20} /> Measurement Photo
                </h2>
                {currentMeasurement.photoUrl ? (
                <a href={currentMeasurement.photoUrl} target="_blank" rel="noopener noreferrer" className="block max-w-[200px] border-4 border-white shadow-md rounded-lg overflow-hidden transition-transform hover:scale-105">
                  <img src={currentMeasurement.photoUrl} alt="Measurement" className="w-full h-auto object-cover" />
                </a>
                ) : (
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-sm text-[var(--muted)] italic">No measurement photo uploaded.</p>
                  </div>
                )}
              </section>

            {currentMeasurement.note && (
              <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 shadow-[var(--shadow)] backdrop-blur">
                <h2 className="text-h2 mb-4 flex items-center gap-2">
                  <Settings size={20} /> Notes
                </h2>`
);

content = content.replace(
  /\{\/\* Note Section \*\/\}/,
  `{/* Photo Upload Section */}
            <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 shadow-[var(--shadow)] backdrop-blur mb-6">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                <ImageIcon size={20} /> Measurement Photo
              </h2>
              <div className="relative group">
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--border)] rounded-xl bg-[var(--surface-strong)] transition-all group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)]/5">
                {photoFile ? (
                   <div className="flex flex-col items-center gap-2">
                     <img src={URL.createObjectURL(photoFile)} alt="Preview" className="h-20 w-20 object-cover rounded-lg border border-[var(--border)] shadow-sm" />
                     <button type="button" onClick={() => setPhotoFile(null)} className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-700 transition z-10 relative">Remove</button>
                   </div>
                ) : isEditingClient && !isAddingMeasurement && client.measurements?.[selectedMeasurementIndex]?.photoUrl ? (
                   <div className="flex flex-col items-center gap-2">
                     <img src={client.measurements[selectedMeasurementIndex].photoUrl} alt="Existing" className="h-20 w-20 object-cover rounded-lg border border-[var(--border)] shadow-sm" />
                     <button type="button" onClick={() => {
                          const newMeasurements = [...client.measurements];
                          newMeasurements[selectedMeasurementIndex].photoUrl = null;
                          saveClientAndClose({...client, measurements: newMeasurements}, selectedMeasurementIndex, false, true);
                     }} className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-700 transition z-10 relative">Remove Existing</button>
                   </div>
                ) : (
                  <>
                    <ImageIcon size={24} className="text-[var(--muted)] mb-2 group-hover:text-[var(--accent)] transition-colors" />
                    <span className="text-sm font-medium text-[var(--text)]">Click to upload photo</span>
                    <span className="text-xs text-[var(--muted)] mt-1">JPEG, PNG, WebP</span>
                  </>
                )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setPhotoFile(e.target.files[0])
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
                />
              </div>
            </section>

            {/* Note Section */}`
);

content = content.replace(
  /<button\n                className="w-full sm:w-auto rounded-xl bg-\[var\(--accent\)\] px-6 py-3 font-semibold text-white shadow-lg shadow-\[var\(--accent\)\]\/25 transition hover:brightness-95 cursor-pointer text-center justify-center flex items-center"/,
  `<button
                className="w-full sm:w-auto rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white shadow-lg shadow-[var(--accent)]/25 transition hover:brightness-95 cursor-pointer text-center justify-center flex items-center disabled:opacity-50" disabled={isUploading}`
);
content = content.replace(
  /Save Measurement\n              <\/button>/,
  `{isUploading ? "Saving..." : "Save Measurement"}
              </button>`
);

content = content.replace(
  /const \[selectedMeasurementIndex, setSelectedMeasurementIndex\] = useState\(0\)/g,
  `const [selectedMeasurementIndex, setSelectedMeasurementIndex] = useState(() => {
    return client?.measurements?.length > 0 ? client.measurements.length - 1 : 0;
  })`
);

content = content.replace(
  /useEffect\(\(\) => \{\n    if \(client\) \{\n      setEditName/,
  `useEffect(() => {
    if (client && client.measurements?.length > 0) {
      setSelectedMeasurementIndex(client.measurements.length - 1);
    } else {
      setSelectedMeasurementIndex(0);
    }
  }, [client?.id, client?.measurements?.length]);

  useEffect(() => {
    if (client) {
      setEditName`
);

fs.writeFileSync('src/pages/Clients/ClientDetail.jsx', content);
