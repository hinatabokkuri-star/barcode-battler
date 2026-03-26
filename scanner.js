// ===== BARCODE BATTLER RPG - scanner.js =====
// バージョン: v0.2.4.4
// 担当: カメラ起動・ZBar WASMによるバーコード読み取り
// ZBar WASMをCDNからdynamic importで読み込む方式
// game.js の processScan() / showToast() / playTone() を使用

let scanStream = null;
let scanTimerId = null;
let scanCanvas = null;
let scanCtx = null;
let cameraActive = false;
let zbarScanImageData = null;
let scanLoopCount = 0;

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
    scanLoopCount = 0;

    scanCanvas = document.createElement('canvas');
    scanCtx = scanCanvas.getContext('2d');

    await new Promise(r => { vid.onloadedmetadata = r; });
    await vid.play();

    document.getElementById('scan-counter').textContent = '📷 スキャン開始...';
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
  scanLoopCount++;

  // デバッグ：10回に1回カウンター更新
  if(scanLoopCount % 10 === 0){
    document.getElementById('scan-counter').textContent =
      `🔍 スキャン中... (${scanLoopCount}回 / ${vid.videoWidth}x${vid.videoHeight})`;
  }

  try{
    if(vid.videoWidth === 0 || vid.videoHeight === 0){
      // ビデオまだ準備できていない
      scanTimerId = setTimeout(scanLoop, 150);
      return;
    }

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
    // エラー内容をカウンターに表示（デバッグ用）
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
  const vid = document.getElementById('camera-video');
  vid.srcObject = null;
  vid.style.display = 'none';
  document.getElementById('camera-ph').style.display = 'flex';
  document.getElementById('scan-overlay').style.display = 'none';
  document.getElementById('camera-btn').textContent = '📷 カメラ起動';
  document.getElementById('scan-counter').textContent = '';
  cameraActive = false;
  scanLoopCount = 0;
}
