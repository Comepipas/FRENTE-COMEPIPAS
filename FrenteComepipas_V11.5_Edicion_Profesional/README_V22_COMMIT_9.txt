V22 COMMIT 9 - SUBIDA DIRECTA DE PDF EN DOCUMENTOS

ANTES DE PROBAR
1. Abrir Supabase > SQL Editor.
2. Ejecutar: supabase/commits/COMMIT_9_DOCUMENTOS_PDF.sql
3. Recargar la aplicación con Ctrl+F5.

PRUEBA
1. Renovaciones > Documentos > Nuevo documento.
2. Seleccionar un PDF del ordenador (máximo 20 MB).
3. Guardar y comprobar que aparece en la lista.
4. Pulsar Abrir PDF.
5. Editar el documento, seleccionar otro PDF y guardar para reemplazarlo.
6. Comprobar en Storage > private-documents > renovaciones que se ha subido.

NOTAS
- Solo se aceptan PDF.
- Los archivos se guardan en un bucket privado y se abren con URL firmada.
- Los documentos antiguos incluidos en assets/docs siguen funcionando.
