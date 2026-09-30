import { useState } from 'react';
import { Download, ExternalLink, FileText, FileWarning } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './ui';

export type FileKind = 'image' | 'pdf' | 'video' | 'audio' | 'office' | 'other';

const EXT: Record<Exclude<FileKind, 'other'>, string[]> = {
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'],
  pdf: ['pdf'],
  video: ['mp4', 'webm', 'mov', 'm4v', 'ogv'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'opus'],
  office: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
};

/** Extension en minusculas, del nombre o, si no tiene, de la URL. */
function extOf(name: string, url: string) {
  const pick = (s: string) => /\.([a-z0-9]{2,5})$/i.exec(s)?.[1]?.toLowerCase() ?? '';
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    /* URL relativa o rara: se usa tal cual */
  }
  return pick(name) || pick(decodeURIComponent(path));
}

export function fileKind(name: string, url: string): FileKind {
  const ext = extOf(name, url);
  for (const [kind, list] of Object.entries(EXT)) if (list.includes(ext)) return kind as FileKind;
  return 'other';
}

function Body({ kind, url, name }: { kind: FileKind; url: string; name: string }) {
  const [failed, setFailed] = useState(false);
  // Office Online recibe la URL del archivo, asi que solo se usa si el usuario lo pide.
  const [officeOk, setOfficeOk] = useState(false);

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-fg-muted">
        <FileWarning size={28} className="text-fg-faint" />
        No se pudo mostrar la vista previa.
      </div>
    );
  }

  switch (kind) {
    case 'image':
      return (
        <div className="flex justify-center rounded-xl bg-surface-2 p-2">
          <img src={url} alt={name} onError={() => setFailed(true)} className="max-h-[70vh] w-auto rounded-lg object-contain" />
        </div>
      );
    case 'pdf':
      return <iframe src={url} title={name} className="h-[72vh] w-full rounded-xl border border-[var(--border)] bg-white" />;
    case 'video':
      return <video src={url} controls onError={() => setFailed(true)} className="max-h-[70vh] w-full rounded-xl bg-black" />;
    case 'audio':
      return (
        <div className="py-10">
          <audio src={url} controls onError={() => setFailed(true)} className="w-full" />
        </div>
      );
    case 'office':
      return officeOk ? (
        <iframe
          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
          title={name}
          className="h-[72vh] w-full rounded-xl border border-[var(--border)] bg-white"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-brand-600/10 text-brand-600">
            <FileText size={26} />
          </span>
          <p className="max-w-sm text-sm text-fg-muted">
            Para ver este documento se usa el visor de <strong>Office Online</strong> (Microsoft), que recibe el enlace
            del archivo.
          </p>
          <Button size="sm" onClick={() => setOfficeOk(true)}>
            Previsualizar con Office Online
          </Button>
        </div>
      );
    default:
      return (
        <div className="flex flex-col items-center gap-3 py-14 text-center text-sm text-fg-muted">
          <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-fg-faint">
            <FileText size={26} />
          </span>
          Este tipo de archivo no tiene vista previa. Descárgalo para abrirlo.
        </div>
      );
  }
}

/** Modal de vista previa para un archivo por URL (imagen, PDF, video, audio, Office u otro). */
export function FilePreview({ file, onClose }: { file: { url: string; name: string } | null; onClose: () => void }) {
  const kind = file ? fileKind(file.name, file.url) : 'other';
  return (
    <Modal
      open={!!file}
      onClose={onClose}
      size={kind === 'audio' || kind === 'other' ? 'md' : 'full'}
      title={<span className="break-all">{file?.name || 'Archivo adjunto'}</span>}
      subtitle={
        file && (
          <span className="mt-1 flex flex-wrap gap-3">
            <a href={file.url} download={file.name} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline">
              <Download size={13} /> Descargar
            </a>
            <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-fg-muted hover:text-fg hover:underline">
              <ExternalLink size={13} /> Abrir en pestaña nueva
            </a>
          </span>
        )
      }
    >
      {file && <Body key={file.url} kind={kind} url={file.url} name={file.name} />}
    </Modal>
  );
}
