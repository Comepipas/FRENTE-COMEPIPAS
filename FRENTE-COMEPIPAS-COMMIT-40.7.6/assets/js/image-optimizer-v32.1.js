(()=>{
  "use strict";

  const MAX_INPUT_BYTES = 30 * 1024 * 1024;
  const MAX_SIDE = 1800;
  const TARGET_BYTES = 2.2 * 1024 * 1024;
  const QUALITY_STEPS = [0.90, 0.84, 0.78, 0.72, 0.66, 0.60];

  function formatBytes(bytes){
    if(!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
    if(bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function loadImage(file){
    return new Promise((resolve,reject)=>{
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = ()=>resolve({image,url});
      image.onerror = ()=>{
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo leer la fotografía seleccionada."));
      };
      image.src = url;
    });
  }

  function canvasToBlob(canvas,type,quality){
    return new Promise((resolve,reject)=>{
      canvas.toBlob(blob=>blob ? resolve(blob) : reject(new Error("No se pudo preparar la fotografía.")),type,quality);
    });
  }

  async function optimize(file){
    if(!file) return null;
    if(!file.type.startsWith("image/")) throw new Error("Selecciona un archivo de imagen válido.");
    if(file.size > MAX_INPUT_BYTES) throw new Error(`La fotografía original supera ${formatBytes(MAX_INPUT_BYTES)}.`);

    const {image,url} = await loadImage(file);
    try{
      const ratio = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth,image.naturalHeight));
      const width = Math.max(1,Math.round(image.naturalWidth * ratio));
      const height = Math.max(1,Math.round(image.naturalHeight * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d",{alpha:true});
      if(!ctx) throw new Error("El navegador no pudo procesar la fotografía.");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image,0,0,width,height);

      let blob = null;
      for(const quality of QUALITY_STEPS){
        blob = await canvasToBlob(canvas,"image/webp",quality);
        if(blob.size <= TARGET_BYTES) break;
      }
      if(!blob) throw new Error("No se pudo optimizar la fotografía.");

      const base = (file.name || "material").replace(/\.[^.]+$/,"").replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-+|-+$/g,"") || "material";
      const optimized = new File([blob],`${base}.webp`,{type:"image/webp",lastModified:Date.now()});
      return {
        file: optimized,
        originalBytes: file.size,
        optimizedBytes: optimized.size,
        originalWidth: image.naturalWidth,
        originalHeight: image.naturalHeight,
        width,
        height,
        changed: optimized.size !== file.size || width !== image.naturalWidth || height !== image.naturalHeight
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  window.FrenteImageOptimizer = {optimize,formatBytes,MAX_INPUT_BYTES,MAX_SIDE,TARGET_BYTES};
})();
