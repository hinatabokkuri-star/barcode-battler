// ===== BARCODE BATTLER RPG - scanner.js =====
// バージョン: v0.2.4.5
// 担当: カメラ起動・ZBar WASMによるバーコード読み取り
// index.htmlで <script src="zbar-cdn.js"> を読み込み済みの前提
// zbarWasm.scanImageData() がグローバルで使える
// game.js の processScan() / showToast() / playTone() を使用

const SCANNER_VERSION = 'v0.2.4.5';

let scanStream = null;
let scanTimerId = null;
let scanCanvas = null;
let scanCtx = null;
let cameraActive = false;

async function toggleCamera(){
  if(cameraActive){ stopCamera(); return; }
  try{
    // zbarWasm グローバル確認
    if(typeof zbarWasm === 'undefined' || typeof zbarWasm.scanImageData !== 'function'){
      showToast('スキャナーの読み込みに失敗しました');
      console.error('zbarWasm.scanImageData が未定義:', typeof zbarWasm);
      return;
    }

    showToast('📷 カメラ起動中...');

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

let _loopCount = 0;
async function scanLoop(){
  if(!cameraActive) return;
  const vid = document.getElementById('camera-video');
  _loopCount++;

  if(_loopCount % 10 === 0){
    document.getElementById('scan-counter').textContent =
      `🔍 スキャン中... (${_loopCount}回 ${vid.videoWidth}x${vid.videoHeight})`;
  }

  try{
    if(vid.videoWidth === 0 || vid.videoHeight === 0){
      scanTimerId = setTimeout(scanLoop, 150);
      return;
    }

    scanCanvas.width = vid.videoWidth;
    scanCanvas.height = vid.videoHeight;
    scanCtx.drawImage(vid, 0, 0);

    const imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
    const symbols = await zbarWasm.scanImageData(imageData);

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
    document.getElementById('scan-counter').textContent = `⚠️ ${e.message||e}`;
    console.error('scanLoop error:', e);
  }

  scanTimerId = setTimeout(scanLoop, 150);
}

function stopCamera(){
  if(scanTimerId){ clearTimeout(scanTimerId); scanTimerId=null; }
  if(scanStream){ scanStream.getTracks().forEach(t=>t.stop()); scanStream=null; }
  scanCanvas = null;
  scanCtx = null;
  _loopCount = 0;
  const vid = document.getElementById('camera-video');
  vid.srcObject = null;
  vid.style.display = 'none';
  document.getElementById('camera-ph').style.display = 'flex';
  document.getElementById('scan-overlay').style.display = 'none';
  document.getElementById('camera-btn').textContent = '📷 カメラ起動';
  document.getElementById('scan-counter').textContent = '';
  cameraActive = false;
}
