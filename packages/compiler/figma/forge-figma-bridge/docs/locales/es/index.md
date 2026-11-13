# Puente del repositorio Forge Figma

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/compiler/figma/forge-figma-bridge/docs/index.md: [packages/compiler/figma/forge-figma-bridge/docs/index.md](../../index.md)
> Idioma: Español (es)

El puente acepta un `ForgeRepositoryExportRequest` revisado sobre un `POST /export` autenticado y escribe el paquete en una de sus raíces de repositorio configuradas explícitamente. Configure las raíces con la opción `--root <id>=<absolute-path>` de la CLI.

Cada proceso del servidor crea un token de autenticación nuevo. La CLI imprime el token cuando se inicia; las personas que llaman deben enviarlo como `Authorization: Bearer <token>` y enviar el origen predeterminado `https://www.figma.com`. El origen se puede cambiar para una integración local configurada explícitamente con la opción de servidor `allowedOrigin`. Las solicitudes de otros orígenes y las solicitudes sin el token se rechazan antes de leer o escribir el paquete.
