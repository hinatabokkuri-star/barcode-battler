// ===== BARCODE BATTLER RPG - scanner.js =====
// バージョン: v0.2.4.3
// 担当: カメラ起動・ZBar WASMによるバーコード読み取り
// ZBar WASMをCDNからdynamic importで読み込む方式
// game.js の processScan() / showToast() / playTone() を使用

let scanStream = null;
let scanTimerId = null;
let scanCanvas = null;
let scanCtx = null;
let cameraActive = false;
let zbarScanImageData = null;

async function initZBar(){
  if(zbarScanImageData) return true;
  try{
    const mod = await import('https://cdn.jsdelivr.net/npm/@undecaf/zbar-wasm@0.11.0/dist/index.js');
    zbarScanImageData = mod.scanImageData;
    return true;
  }catch(e){
    console.error('ZBar読み込み失敗:', e);
    return false;
  }
}

async function toggleCamera(){
  if(cameraActive){ stopCamera(); return; }
  try{
    showToast('📷 初期化中...');

    const ok = await initZBar();
    if(!ok){ showToast('スキャナーの読み込みに失敗しました'); return; }

    // 背面カメラ取得
    let stream;
    try{
      stream = await navigator.mediaDevices.getUserMedia({
        video:{ facingMode:{exact:'environment'}, width:{ideal:1920}, height:{ideal:1080} }
      });
    }catch(e){
      stream = await navigator.mediaDevices.getUserMedia({
        video:{ facingMode:'environment' }
      });
    }

    scanStream = stream;
    const vid = document.getElementById('camera-video');
    vid.srcObject = stream;
    vid.style.display = 'block';
    document.getElementById('camera-ph').style.display = 'none';
    document.getElementById('scan-overlay').style.display = 'flex';
    document.getElementById('camera-btn').textContent = '⏹ カメラ停止';
    cameraActive = true;

    scanCanvas = document.createElement('canvas');
    scanCtx = scanCanvas.getContext('2d');

    await new Promise(r => { vid.onloadedmetadata = r; });
    await vid.play();

    document.getElementById('scan-counter').textContent = '📷 バーコードに近づけてください';
    scanLoop();

  }catch(e){
    console.error(e);
    showToast('カメラのアクセスが必要です');
    cameraActive = false;
  }
}

async function scanLoop(){
  if(!cameraActive) return;
  const vid = document.getElementById('camera-video');

  try{
    scanCanvas.width = vid.videoWidth;
    scanCanvas.height = vid.videoHeight;
    scanCtx.drawImage(vid, 0, 0);

    const imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
    const symbols = await zbarScanImageData(imageData);

    if(symbols && symbols.length > 0){
      const code = symbols[0].decode();
      document.getElementById('scan-counter').textContent = `✅ ${code}`;
      playTone(880,'sine',0.15,0.4);
      showToast('✅ ' + code + ' 読み取り成功！');
      stopCamera();
      processScan(code);
      return;
    }
  }catch(e){
    // フレームエラーは無視
  }

  scanTimerId = setTimeout(scanLoop, 150);
}

function stopCamera(){
  if(scanTimerId){ clearTimeout(scanTimerId); scanTimerId=null; }
  if(scanStream){ scanStream.getTracks().forEach(t=>t.stop()); scanStream=null; }
  scanCanvas = null;
  scanCtx = null;
  const vid = document.getElementById('camera-video');
  vid.srcObject = null;
  vid.style.display = 'none';
  document.getElementById('camera-ph').style.display = 'flex';
  document.getElementById('scan-overlay').style.display = 'none';
  document.getElementById('camera-btn').textContent = '📷 カメラ起動';
  document.getElementById('scan-counter').textContent = '';
  cameraActive = false;
}
