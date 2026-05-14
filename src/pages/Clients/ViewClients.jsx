import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Search, UsersRound, Eye, Pencil, Trash2, Download, Plus } from 'lucide-react'
import html2pdf from 'html2pdf.js'
import { formatDateDDMMYY } from '../../utils/constants'

import supabase from '../../supabase'

function ViewClientsPage({ themeStyle, setCurrentPage, setSelectedClient, setClientDetailMode, showGlobalToast, currentUser, highlightClientId, setHighlightClientId, clients, setClients }) {
  const rowRefs = useRef({})
  const [searchQuery, setSearchQuery] = useState('')
  const [clientToDelete, setClientToDelete] = useState(null)

  const filteredClients = clients.filter(client =>
    (client.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.mobile || '').includes(searchQuery) ||
    (client.address || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.clientProduct || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const [currentPageNum, setCurrentPageNum] = useState(1)
  const itemsPerPage = 10

  const sortedClients = [...filteredClients].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  const totalPages = Math.ceil(sortedClients.length / itemsPerPage)

  // Scroll to highlight logic
  useEffect(() => {
    if (highlightClientId) {
      const index = sortedClients.findIndex(c => c.id === highlightClientId);
      if (index !== -1) {
        const page = Math.floor(index / itemsPerPage) + 1;
        setCurrentPageNum(page);

        setTimeout(() => {
          const row = rowRefs.current[highlightClientId];
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              if (setHighlightClientId) setHighlightClientId(null);
            }, 3000);
          }
        }, 300);
      }
    }
  }, [highlightClientId, sortedClients]);

  const paginatedClients = sortedClients.slice((currentPageNum - 1) * itemsPerPage, currentPageNum * itemsPerPage)

  const downloadClientPdf = (client) => {
    if (showGlobalToast) showGlobalToast('Generating PDF...', 'Please wait while we prepare the document.')

    const container = document.createElement('div')
    container.style.padding = '40px'
    container.style.fontFamily = '"Inter", system-ui, -apple-system, sans-serif'
    container.style.color = '#1f2937'
    container.style.maxWidth = '800px'
    container.style.margin = '0 auto'

    let html = `
      <div style="border-bottom: 2px solid #8e4431; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <img src="/logo-black.png" style="width: 60px; height: 60px; object-fit: contain;" />
          <div>
            <h1 style="font-size: 24px; font-weight: 800; color: #8e4431; margin: 0; letter-spacing: -0.5px;">CLASSY COUTURE</h1>
            <p style="font-size: 10px; color: #6b7280; margin: 2px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Be Unique, Be Classy</p>
            <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Client Measurement Record</p>
          </div>
        </div>
        <div style="text-align: right;">
          <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0;">${client.name}</h2>
          <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">Generated: ${formatDateDDMMYY(new Date().toISOString())}</p>
        </div>
      </div>
      
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 40px; border: 1px solid #f3f4f6;">
        <h3 style="font-size: 14px; color: #8e4431; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Personal Information</h3>
        <div style="display: flex; gap: 40px;">
          <div>
            <p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Mobile Number</p>
            <p style="margin: 0; font-size: 14px; font-weight: 500;">${client.mobile || 'N/A'}</p>
          </div>
          <div>
            <p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Client Since</p>
            <p style="margin: 0; font-size: 14px; font-weight: 500;">${formatDateDDMMYY(client.createdAt)}</p>
          </div>
          <div style="flex: 1;">
            <p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Address</p>
            <p style="margin: 0; font-size: 14px; font-weight: 500;">${client.address || 'N/A'}</p>
          </div>
        </div>
      </div>
    `

    const measurementsList = client.measurements?.length > 0 ? client.measurements : []
    if (measurementsList.length === 0 && client.product) {
      measurementsList.push({
        product: client.product,
        topMeasurements: client.topMeasurements || {},
        bottomMeasurements: client.bottomMeasurements || {},
        note: client.note
      })
    }

    if (measurementsList.length > 0) {
      measurementsList.forEach((m, idx) => {
        html += `
          <div style="margin-bottom: 40px; page-break-inside: avoid;">
            <div style="margin-bottom: 20px;">
              <div style="display: inline-block; vertical-align: middle; background-color: #8e4431; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 12px; margin-right: 10px;">${idx + 1}</div>
              <h3 style="display: inline-block; vertical-align: middle; font-size: 18px; color: #111827; margin: 0; font-weight: 600;">${m.product || 'Unspecified Product'}</h3>
            </div>
        `

        const renderTable = (title, measurementsObj, fields) => {
          if (!measurementsObj || !Object.keys(measurementsObj).some(k => measurementsObj[k])) return ''

          let tableHtml = `
            <div style="margin-bottom: 20px;">
              <h4 style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">${title}</h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr>
                    <th style="padding: 10px 12px; border-bottom: 2px solid #e5e7eb; text-align: left; color: #4b5563; font-weight: 600; width: 40%;">Property</th>
                    <th style="padding: 10px 12px; border-bottom: 2px solid #e5e7eb; text-align: left; color: #4b5563; font-weight: 600; width: 30%;">Length</th>
                    <th style="padding: 10px 12px; border-bottom: 2px solid #e5e7eb; text-align: left; color: #4b5563; font-weight: 600; width: 30%;">Round</th>
                  </tr>
                </thead>
                <tbody>
          `

          let hasRows = false;
          let rowIndex = 0;

          if (measurementsObj.length) {
            hasRows = true;
            tableHtml += `<tr style="background-color: ${rowIndex % 2 === 0 ? '#ffffff' : '#f9fafb'};">
              <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-weight: 500; color: #111827;">Product Length</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #4b5563;">${measurementsObj.length}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #9ca3af;">-</td>
            </tr>`
            rowIndex++;
          }

          fields.forEach(f => {
            const l = measurementsObj[`${f.key}Length`]
            const r = measurementsObj[`${f.key}Round`]
            if (l || r) {
              hasRows = true;
              tableHtml += `<tr style="background-color: ${rowIndex % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-weight: 500; color: #111827;">${f.label}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #4b5563;">${l || '<span style="color:#d1d5db">-</span>'}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #4b5563;">${r || '<span style="color:#d1d5db">-</span>'}</td>
              </tr>`
              rowIndex++;
            }
          })

          tableHtml += `</tbody></table></div>`
          return hasRows ? tableHtml : ''
        }

        const topFields = [
          { key: 'upChest', label: 'Up-Chest' }, { key: 'chest', label: 'Chest' }, { key: 'bust', label: 'Bust' },
          { key: 'waist', label: 'Waist' }, { key: 'hip', label: 'Hip' }, { key: 'shoulder', label: 'Shoulder' },
          { key: 'front', label: 'Front' }, { key: 'back', label: 'Back' }, { key: 'neckF', label: 'Neck F' },
          { key: 'neckB', label: 'Neck B' }, { key: 'fullSleeves', label: 'Full Sleeves' },
          { key: 'threeQuarterSleeves', label: '3/4 Sleeves' }, { key: 'elbow', label: 'Elbow' }
        ]
        html += renderTable('Top Measurements', m.topMeasurements, topFields)

        const bottomFields = [
          { key: 'waist', label: 'Waist' }, { key: 'hip', label: 'Hip' }, { key: 'thighs', label: 'Thighs' },
          { key: 'knee', label: 'Knee' }, { key: 'calf', label: 'Calf' }, { key: 'ankle', label: 'Ankle' },
          { key: 'crotch', label: 'Crotch' }
        ]
        html += renderTable('Bottom Measurements', m.bottomMeasurements, bottomFields)

        if (m.note) {
          html += `<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-top: 10px;">
            <p style="margin: 0; font-size: 11px; color: #b45309; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Special Notes</p>
            <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.4;">${m.note}</p>
          </div>`
        }

        html += `</div>`
      })
    } else {
      html += `<p style="font-style: italic; color: #6b7280;">No measurements recorded yet.</p>`
    }

    container.innerHTML = html

    const opt = {
      margin: 10,
      filename: `Client_${client.name.replace(/\\s+/g, '_')}_Details.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    html2pdf().set(opt).from(container).save()
  }

  return (
    <div style={themeStyle}>
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-[var(--text)]">Delete Client</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Are you sure you want to delete <span className="font-semibold text-[var(--text)]">{clientToDelete.name}</span>? This action cannot be undone and will remove all their associated measurements.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold transition hover:bg-[var(--soft)]"
                onClick={() => setClientToDelete(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                onClick={async () => {
                  try {
                    // 1. Delete from Cloud (Permanent)
                    const { error } = await supabase
                      .from('erp_clients')
                      .delete()
                      .eq('id', clientToDelete.id || clientToDelete.mobile);
                    
                    if (error) throw error;

                    // 2. Update local UI
                    const updated = clients.filter(c => c.mobile !== clientToDelete.mobile)
                    setClients(updated)
                    setClientToDelete(null)
                    if (showGlobalToast) showGlobalToast('Deleted!', 'Client successfully removed from cloud.')
                  } catch (err) {
                    alert("Cloud delete failed: " + err.message);
                  }
                }}
              >
                Delete Client
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent)] mb-1">
            <UsersRound size={16} /> CRM Database
          </p>
          <h1 className="text-3xl font-semibold">View Clients</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Manage and search all client records</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <label className="flex sm:flex-1 h-11 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--muted)] shadow-sm">
            <Search size={17} />
            <input
              className="w-full bg-transparent outline-none placeholder:text-stone-400"
              placeholder="Search clients..."
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition hover:brightness-95 active:scale-95 whitespace-nowrap"
            onClick={() => setCurrentPage('add-clients')}
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add New Client</span>
            <span className="sm:hidden">Add Client</span>
          </button>
        </div>
      </div>

      </div>

      <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
        <div className="erp-table-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Product</th>
                <th>Address</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.length > 0 ? (
                paginatedClients.map((client) => (
                  <tr
                    key={client.id || client.mobile}
                    ref={el => rowRefs.current[client.id] = el}
                    className={`group transition-all duration-1000 ${highlightClientId === client.id ? 'bg-[var(--accent-soft)]/50 ring-2 ring-[var(--accent)] ring-inset' : ''}`}
                  >
                    <td>
                      <span className="font-semibold text-[var(--text)]">{client.name}</span>
                    </td>
                    <td>{client.mobile}</td>
                    <td>
                      {client.measurements?.length > 0
                        ? client.measurements.map(m => m.product).join(', ')
                        : (client.product || '-')}
                    </td>
                    <td>{client.address}</td>
                    <td>{formatDateDDMMYY(client.createdAt)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
                          title="View Details"
                          onClick={() => {
                            setSelectedClient(client)
                            if (setClientDetailMode) setClientDetailMode('view')
                            setCurrentPage('client-detail')
                          }}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
                          title="Edit Client"
                          onClick={() => {
                            setSelectedClient(client)
                            if (setClientDetailMode) setClientDetailMode('edit')
                            setCurrentPage('client-detail')
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        {currentUser?.role === 'Admin' && (
                          <button
                            className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
                            title="Delete Client"
                            onClick={() => setClientToDelete(client)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <button
                          className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
                          title="Download PDF"
                          onClick={() => downloadClientPdf(client)}
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                    No clients found matching "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
            <span className="text-sm text-[var(--muted)]">Showing {(currentPageNum - 1) * itemsPerPage + 1} to {Math.min(currentPageNum * itemsPerPage, filteredClients.length)} of {filteredClients.length}</span>
            <div className="flex gap-2">
              <button
                disabled={currentPageNum === 1}
                onClick={() => setCurrentPageNum(prev => prev - 1)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] transition hover:bg-[var(--soft)] disabled:opacity-50 text-[var(--text)]"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={currentPageNum === totalPages}
                onClick={() => setCurrentPageNum(prev => prev + 1)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] transition hover:bg-[var(--soft)] disabled:opacity-50 text-[var(--text)]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default ViewClientsPage;
