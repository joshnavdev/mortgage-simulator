import { useRef, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

export type UploadedImage = {
  id: string;
  key: string;
  previewUrl: string;
};

type ImageUploadGalleryProps = {
  images: UploadedImage[];
  uploading: boolean;
  onPickFiles: (files: FileList) => void;
  onRemove: (id: string) => void;
};

export default function ImageUploadGallery({
  images,
  uploading,
  onPickFiles,
  onRemove,
}: ImageUploadGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="ynab-txn__upload-row">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        onChange={(e) => {
          const { files } = e.target;
          if (files && files.length > 0) onPickFiles(files);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />
      <button
        type="button"
        className="btn-primary"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Subiendo…" : images.length > 0 ? "Agregar más" : "Subir imágenes"}
      </button>

      {images.length > 0 && (
        <div className="ynab-txn__thumb-grid">
          {images.map((image, index) => (
            <div key={image.id} className="ynab-txn__thumb-wrapper">
              <img
                className="ynab-txn__thumb"
                src={image.previewUrl}
                alt="Vista previa del screenshot"
                onClick={() => setLightboxIndex(index)}
              />
              <button
                type="button"
                className="ynab-txn__thumb-remove"
                onClick={() => onRemove(image.id)}
                aria-label="Eliminar imagen"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <Lightbox
        open={lightboxIndex >= 0}
        index={lightboxIndex < 0 ? 0 : lightboxIndex}
        close={() => setLightboxIndex(-1)}
        slides={images.map((image) => ({ src: image.previewUrl }))}
      />
    </div>
  );
}
