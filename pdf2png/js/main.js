const log = document.getElementById('log');

function downloadBlob(blob, fileName) {
  // Создаем объект URL для Blob
  var url = URL.createObjectURL(blob);
  
  // Создаем ссылку для скачивания
  var a = document.createElement('a');
  a.href = url;
  
  // Устанавливаем имя файла для скачивания
  a.download = fileName;
  
  // Добавляем ссылку на страницу
  document.body.appendChild(a);
  
  // Автоматически кликаем на ссылку для скачивания файла
  a.click();
  
  // Удаляем ссылку со страницы
  document.body.removeChild(a);
  
  // Освобождаем ресурсы объекта URL
  URL.revokeObjectURL(url);
}

function addLogEntry(message, prompt = '-> ') {
  var entry = document.createElement('li');
  entry.style = "list-style: none;";
  entry.textContent = prompt + message;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

function clearLog() {
  log.textContent = '';
  addLogEntry("[ Журнал операций ]", '');
}

function combLog(val) {
  addLogEntry(val);
  rlog(val)
}

const rlog = console.log;
console.log = combLog;

var input_scale = 1,
  input_quality = 0.8,
  input_format = 'image/png';
  output_select = 'zip';
  
var scale_input = document.getElementById('scale_input');
scale_input.addEventListener('input', onScaleInput);

function onScaleInput() {
  input_scale = Number(this.value);
  var output_scale = document.getElementById('output_scale_input');
  output_scale.value = input_scale;
}

var quality_input = document.getElementById('quality_input');
quality_input.addEventListener('input', onQualityInput);

function onQualityInput() {
  input_quality = Number(this.value);
  var output_quality = document.getElementById('output_quality_input');
  output_quality.value = input_quality;
}

var format_output_select = document.getElementById('format_output_select');
format_output_select.addEventListener('change', onOutputSelect);

function onOutputSelect() {
  output_select = this.value;
}

var format_select = document.getElementById('format_select');
format_select.addEventListener('change', onFormatSelect);

function onFormatSelect() {
  input_format = this.value;
}

var convert_pdf = document.getElementById('convert_pdf');
convert_pdf.addEventListener('click', onProcessInputPDF);


function toggleStates(enable) {
  disabled = !enable;
  input_pdf.disabled = disabled;
  format_select.disabled = disabled;
  quality_input.disabled = disabled;
  scale_input.disabled = disabled;
  convert_pdf.disabled = disabled;
}

function updatePreview(url) {
  document.getElementById('pdf_preview').src = url + '#toolbar=0';
}

function resetPreview() {
  document.getElementById('pdf_preview').src = 'placeholder/preview.pdf' + '#toolbar=0';
}

var input_pdf = document.getElementById('pdf_input');
input_pdf.addEventListener('input', onInputPDF);

var input_pdf_overlay = document.getElementById('pdf_input_overlay');
input_pdf_overlay.addEventListener('click', () => { input_pdf.click() });

function onInputPDF() {

  var file = this.files[0]

  if (!file) {
    return;
  }

  clearLog();

  var selected_file_name = document.getElementById('selected_file_name');

  if (file.type != 'application/pdf') {
    pdfName = null;
    pdfFileObject = null;
    console.log(file.name + " - Неподдерживаемый формат файла. Выберите файл PDF!!");
    selected_file_name.value = file.name + " - Неподдерживаемый формат файла!";
    selected_file_name.style.display = "flex";
    // resetPreview();
    return;
  }

  var fileURL = URL.createObjectURL(file);
//   updatePreview(fileURL);
  pdfName = file['name'];
  pdfFileObject = file;
  selected_file_name.value = pdfName;
  selected_file_name.style.display = "flex";
}

function onProcessInputPDF() {

  if (!pdfFileObject) {
    return;
  }

  toggleStates(false);
  clearLog();

  console.log("Загружаются выбранные файлы...");

  const reader = new FileReader();

  reader.onload = function (e) {
    var url = e.target.result;
    pdf2img(url);
  }
  if (pdfFileObject) {
    reader.readAsDataURL(pdfFileObject);
  } else {
    console.log("Ошибка чтения файла... Выберите файл еще раз...");
    toggleStates(true);
  }
}

pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/pdf.worker.min-2.5.207.js';

var pdfDoc = null,
  pageNum = 1,
  pdfFileObject = null,
  pageRendering = false,
  pageCount = 0,
  pageNumPending = null,
  pageScale = input_scale,
  pageQuality = input_quality,
  pageFormat = input_format,
  imgData = null,
  pdfName = "doc";

var canvas = document.getElementById('page_canvas');
var ctx = canvas.getContext('2d');

function pdf2img(pdf_url) {
  readPDF(pdf_url)
    .then(() => downloadAll(),
      () => {
        console.log("Error reading PDF... May be an encrypted one [-_^]");
        toggleStates(true);
      });
}


function readPDF(url) {
  return new Promise((resolve, reject) => {
    var selected_file_name = document.getElementById('selected_file_name');
    selected_file_name.style.display = "flex";
    var loadingTask = pdfjsLib.getDocument(url);
    loadingTask.promise.then(function (pdfDoc_) {
      pdfDoc = pdfDoc_;
      resetPDFMetaStore(pdfDoc.numPages);
      console.log("PDF Загружен: " + pdfName);
      selected_file_name.value += ' - ' + pageCount + ' Страниц(ы)';
      resolve(1);
    },
      () => reject(1));
  });
}

function resetPDFMetaStore(numPages) {
  pageCount = numPages;
  imgData = {};
  pageNumPending = [];
  pageScale = input_scale;
  pageQuality = input_quality;
  pageFormat = input_format;
}

/**
 * Get page info from document, resize canvas accordingly, and render page.
 * @param num Page number.
 */
function renderPage(num) {
  pageRendering = true;
  // Using promise to fetch the page
  pdfDoc.getPage(num).then(function (page) {
    var viewport = page.getViewport({ scale: pageScale, });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page into canvas context
    var renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };
    var renderTask = page.render(renderContext);

    // Wait for rendering to finish
    renderTask.promise.then(function () {

      canvas.toBlob(function (blob) {
        imgData[num] = blob;
        console.log("Сохранена страница: " + num);
        pageRendering = false;

        if (pageNumPending !== null && pageNumPending.length != 0) {
          // New page rendering is pending
          renderPage(pageNumPending.shift());

        } else {
          if (Object.keys(imgData).length == pageCount) {
            console.log("Сканирование выполнено");
            if (output_select == "zip") {
              processImageData();
            } else {
              processImageDataImg();
            }
            
          }
        }
      }, pageFormat, pageQuality);
    });
  });

  console.log("Обрабатывается страница: " + num);
}

function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending.push(num);
  } else {
    renderPage(num);
  }
}

function downloadAll() {
  for (i = 1; i <= pageCount; i++) {
    queueRenderPage(i)
  }
}

function processImageData() {
  console.log("Создание Zip...");
  var zip = new JSZip();
  var pages = zip.folder(pdfName);

  for (i = 1; i <= pageCount; i++) {
    var page = imgData[i];
    var ext = page.type.replace("image/", ".");
    var pdfNameNoExt = pdfName.slice(0, -4);
    pages.file(pdfNameNoExt + "_page_" + i + ext, page);

  }

  zip.generateAsync({ type: "blob" }).then(function (content) {
    console.log("Скачивание Zip...");
    saveAs(content, pdfName + ".zip");
    console.log(pdfName + ".zip" + " - Скачивание завершено");
    toggleStates(true);
  });
}

function processImageDataImg() {
  console.log("Скачиваю IMG...");
  
  for (i = 1; i <= pageCount; i++) {
    var page = imgData[i];
    var pdfNameNoExt = pdfName.slice(0, -4);
    var ext = page.type.replace("image/", ".");
    downloadBlob(page, pdfNameNoExt + "_page_" + i + ext);
    console.log("Скачан " + pdfNameNoExt + "_page_" + i + ext);
  }
  toggleStates(true);

}