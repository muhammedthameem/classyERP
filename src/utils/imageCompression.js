/**
 * Compresses an image file before upload using HTML5 Canvas.
 * @param {File} file The original image file
 * @param {number} maxWidth Maximum width
 * @param {number} maxHeight Maximum height
 * @param {number} quality Compression quality (0 to 1)
 * @returns {Promise<File>} The compressed WebP File
 */
export const compressImage = async (file, maxWidth = 1280, maxHeight = 1280, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve(file); // Return original if not an image
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        
        // Handle transparency for images converted to WebP
        ctx.fillStyle = 'rgba(255, 255, 255, 0)';
        ctx.clearRect(0, 0, width, height);
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas compression failed'));
            return;
          }
          
          // Generate new filename with .webp extension
          const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
          const compressedFile = new File([blob], newFileName, {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          
          resolve(compressedFile);
        }, 'image/webp', quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
