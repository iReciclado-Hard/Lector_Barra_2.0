document.addEventListener('DOMContentLoaded', () => {
    const codeReader = new ZXing.BrowserMultiFormatReader();
    const videoElement = document.getElementById('video-preview');
    const beepSound = document.getElementById('beep-sound');
    const resultElement = document.getElementById('result');
    const productInfoElement = document.getElementById('productInfo');
    let scanning = false;

    // Configura el botón de iniciar escaneo
    document.getElementById('startScan').addEventListener('click', async () => {
        if (!scanning) {
            resultElement.innerText = "Escaneando...";
            resultElement.style.display = 'block';

            try {
                // Listar los dispositivos de video disponibles
                const cameras = await codeReader.listVideoInputDevices();
                if (cameras.length > 0) {
                    // Seleccionar la cámara trasera por defecto, si está disponible
                    const selectedCamera = cameras.find(camera => camera.label.includes('back')) || cameras[0];

                    // Iniciar el escaneo desde la cámara seleccionada
                    codeReader.decodeFromVideoDevice(selectedCamera.deviceId, 'video-preview', async (result, err) => {
                        if (result) {
                            beepSound.play();
                            const scannedCode = result.text;
                            resultElement.innerText = `Último Código Escaneado: ${scannedCode}`;
                            resultElement.style.display = 'block';
                            codeReader.reset(); // Detener el escaneo después de encontrar un código
                            scanning = false;

                            // Buscar el producto en Google Sheets
                            const productData = await findProductData(scannedCode);
                            displayProductData(productData);
                        }
                        if (err && !(err instanceof ZXing.NotFoundException)) {
                            console.error('Error al escanear el código:', err);
                        }
                    });
                    scanning = true;
                } else {
                    console.error('No se encontraron cámaras.');
                    alert('No se encontraron cámaras. Por favor, verifica los permisos y vuelve a intentarlo.');
                }
            } catch (e) {
                console.error('Error al acceder a la cámara:', e);
                alert('Error al acceder a la cámara. Por favor, verifica los permisos y vuelve a intentarlo.');
            }
        }
    });

    // Configura el botón de detener escaneo
    document.getElementById('stopScan').addEventListener('click', () => {
        if (scanning) {
            codeReader.reset(); // Detener el escaneo
            scanning = false;
            resultElement.style.display = 'none';
            displayProductData(null); // Limpiar la información del producto
        }
    });

    // Función para obtener datos de Google Sheets
    async function fetchSheetData() {
        const sheetId = '1OyOanAl_4iX9iOZcAjdbkpOZ4NdeU20dgicUSuxxwds'; // ID de tu hoja de Google
        const sheetName = 'Hoja1'; // Nombre de la hoja
        const apiKey = 'AIzaSyDm6d6BmC8Kco00EspVcmpUHIzxu0K5vG4'; // Clave de API de Google
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=${apiKey}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al obtener los datos');
            const data = await response.json();
            return data.values; // Devuelve los valores de la hoja de cálculo
        } catch (error) {
            console.error('Error fetching sheet data:', error);
            return null;
        }
    }

    // Función para encontrar datos del producto por código
    async function findProductData(code) {
        const data = await fetchSheetData();
        if (!data) return null;

        const header = data[0]; // La primera fila se asume que es el encabezado de las columnas
        const rows = data.slice(1); // Las filas de datos, omitiendo el encabezado

        for (const row of rows) {
            const rowData = {};
            row.forEach((cell, index) => {
                rowData[header[index]] = cell; // Mapea las celdas de cada fila a sus respectivos nombres de columna
            });

            if (rowData['BarCode'] === code) { // Busca en la columna "BarCode"
                return rowData; // Devuelve la fila completa como un objeto si encuentra el código
            }
        }
        return null; // Devuelve null si no se encuentra el código
    }

    // Función para mostrar los datos del producto en la página
    function displayProductData(productData) {
        if (productData) {
            productInfoElement.innerHTML = `
                <p><strong>Descripcion:</strong> ${productData['Descripcion']}</p>;
                <p><strong>Precio:</strong> ${productData['Precio']}</p>;
                <p class="sugerido" style="color: red; font-size: larger;"><strong>Sugerido:</strong> ${productData['Sugerido']}</p>;
            `;
        } else {
            productInfoElement.innerHTML = `<p>Producto no encontrado.</p>`;
        }
    }
});
