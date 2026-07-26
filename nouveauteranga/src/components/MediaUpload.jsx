import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, Download, Trash2, FileText, ZoomIn,
  AlertCircle, Paperclip, ChevronLeft, ChevronRight
} from 'lucide-react';
import mediaService from '../services/mediaService';
import ConfirmModal from './ui/ConfirmModal';

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx';

function FileIcon({ mimeType }) {
  if (mimeType?.startsWith('image/')) return null;
  return <FileText className="w-4 h-4 text-[#D97706]" />;
}

/**
 * Composant réutilisable de gestion des médias.
 *
 * Props:
 *   entityType  — 'infractions' | 'accidents' | 'personnels' | 'victimes' | 'immigrations-clandestines'
 *   entityId    — id de l'entité
 *   readOnly    — désactiver upload/suppression (optionnel)
 */
export default function MediaUpload({ entityType, entityId, readOnly = false }) {
  const [files, setFiles]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const [toast, setToast]         = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // lightbox
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const inputRef = useRef(null);

  const images = files.filter(f => f.is_image);
  const docs   = files.filter(f => !f.is_image);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadFiles = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const res = await mediaService.getAll(entityType, entityId);
      setFiles(res.data?.data || []);
    } catch (err) {
      if (err?.response?.status !== 404) {
        showToast('Erreur lors du chargement des fichiers', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFiles(); }, [entityType, entityId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (fileList) => {
    if (!fileList?.length || readOnly) return;
    setUploading(true);
    try {
      await mediaService.upload(entityType, entityId, fileList);
      showToast(`${fileList.length} fichier(s) uploadé(s) avec succès`);
      if (inputRef.current) inputRef.current.value = '';
      await loadFiles();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de l\'upload', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (mediaId, filename) => setDeleteTarget({ id: mediaId, filename });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await mediaService.delete(deleteTarget.id);
      showToast('Fichier supprimé');
      setFiles(f => f.filter(x => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownload = (file) => {
    mediaService.download(file.id, file.filename)
      .catch(() => showToast('Erreur lors du téléchargement', 'error'));
  };

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () => setLightboxIndex(i => (i - 1 + images.length) % images.length);
  const nextImage = () => setLightboxIndex(i => (i + 1) % images.length);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const onKeyDown = (e) => {
    if (lightboxIndex === null) return;
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'Escape') closeLightbox();
  };

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entityId) return null;

  return (
    <div className="space-y-4">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white ${toast.type === 'error' ? 'bg-[#DC2626]' : 'bg-[#16A34A]'}`}>
            <AlertCircle className="w-3.5 h-3.5" />
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone de dépôt */}
      {!readOnly && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1B4332]/10'
              : 'border-[#CBD5E1] dark:border-white/15 hover:border-[#2563EB]/50 hover:bg-[#F8FAFC] dark:hover:bg-white/3'
          }`}
        >
          <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden"
            onChange={e => handleUpload(e.target.files)} />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-xs text-[#2563EB]">
              <div className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
              Upload en cours…
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <Upload className="w-5 h-5 text-[#94A3B8]" />
              <p className="text-xs text-[#64748B] dark:text-white/50">
                Glisser-déposer ou <span className="text-[#2563EB] font-medium">parcourir</span>
              </p>
              <p className="text-[10px] text-[#94A3B8]">Images, PDF, Word — max 10 Mo par fichier</p>
            </div>
          )}
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="aspect-square bg-[#F1F5F9] dark:bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <p className="text-xs text-[#94A3B8] dark:text-white/30 text-center py-3 flex items-center justify-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" /> Aucun fichier attaché
        </p>
      ) : (
        <div className="space-y-3">

          {/* Grille photos */}
          {images.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[#94A3B8] dark:text-white/30 uppercase tracking-wide mb-2">
                Photos ({images.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {images.map((file, i) => (
                  <div key={file.id} className="relative group aspect-square">
                    <img
                      src={file.url}
                      alt={file.filename}
                      className="w-full h-full object-cover rounded-xl border border-[#CBD5E1] dark:border-white/10"
                    />
                    {/* Overlay au hover */}
                    <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => openLightbox(i)}
                        className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#1B4332] transition-colors"
                        title="Agrandir"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownload(file)}
                        className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#2563EB] transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {!readOnly && (
                        <button
                          onClick={() => handleDelete(file.id, file.filename)}
                          className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#DC2626] transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {/* Nom au bas */}
                    <div className="absolute bottom-0 left-0 right-0 rounded-b-xl px-1.5 py-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[9px] text-white truncate">{file.size_human}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Liste documents */}
          {docs.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[#94A3B8] dark:text-white/30 uppercase tracking-wide mb-2">
                Documents ({docs.length})
              </p>
              <div className="space-y-1.5">
                {docs.map(file => (
                  <div key={file.id}
                    className="flex items-center gap-2.5 px-3 py-2 bg-[#F8FAFC] dark:bg-white/3 border border-[#CBD5E1] dark:border-white/15 rounded-lg group">
                    <FileIcon mimeType={file.mime_type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#0F172A] dark:text-white truncate">{file.filename}</p>
                      <p className="text-[10px] text-[#94A3B8]">{file.size_human}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDownload(file)}
                        className="p-1 rounded hover:bg-[#EFF6FF] text-[#2563EB] transition-colors" title="Télécharger">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {!readOnly && (
                        <button onClick={() => handleDelete(file.id, file.filename)}
                          className="p-1 rounded hover:bg-[#FEF2F2] text-[#DC2626] transition-colors" title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
        title="Supprimer le fichier"
        message={deleteTarget ? `"${deleteTarget.filename}" sera définitivement supprimé.` : ''}
      />

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && images[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            {/* Bouton fermer */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Compteur */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white text-xs">
              {lightboxIndex + 1} / {images.length}
            </div>

            {/* Flèche gauche */}
            {images.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); prevImage(); }}
                className="absolute left-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Image */}
            <motion.div
              key={lightboxIndex}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={e => e.stopPropagation()}
              className="relative max-w-4xl max-h-[85vh] flex flex-col items-center"
            >
              <img
                src={images[lightboxIndex].url}
                alt={images[lightboxIndex].filename}
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              />
              <div className="mt-3 flex items-center gap-3">
                <p className="text-white/70 text-xs">{images[lightboxIndex].filename} — {images[lightboxIndex].size_human}</p>
                <button
                  onClick={() => handleDownload(images[lightboxIndex])}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Télécharger
                </button>
              </div>
            </motion.div>

            {/* Flèche droite */}
            {images.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); nextImage(); }}
                className="absolute right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Miniatures navigation */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={e => { e.stopPropagation(); setLightboxIndex(i); }}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                      i === lightboxIndex ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
