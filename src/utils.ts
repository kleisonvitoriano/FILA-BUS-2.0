// Static theme mapping for color codes
export function getThemeHex() {
  const theme = localStorage.getItem("appTheme") || "theme-indigo";
  const map: { [key: string]: string } = {
    "theme-indigo": "6366f1",
    "theme-emerald": "10b981",
    "theme-rose": "f43f5e",
    "theme-amber": "f59e0b"
  };
  return map[theme] || "dc2626"; // Fallback red
}

// Client-side image optimization (downscaling using canvas to maximize load performance and minimize upload bandwidth)
export function optimizeImage(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85); // High-quality downscaled image data URI
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Image load error"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsDataURL(file);
  });
}

// XSS Sanitizer for rendering user text safely
export function escapeHTML(str: string): string {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>"']/g, (m) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m] || m;
  });
}
