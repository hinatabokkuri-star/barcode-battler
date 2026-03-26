// ===== BARCODE BATTLER RPG - scanner.js =====
// バージョン: v0.2.4.1
// 担当: カメラ起動・ZBar WASMによるバーコード読み取り
// 依存: zbar.js / zbar.wasm（同ディレクトリ）、game.jsのprocessScan()・showToast()・playTone()

let scanStream = null;
let scanAnimFrame = null;
let scanCanvas = null;
let scanCtx = null;
let zbarScanner = null;
let cameraActive = false;

async function initZBar(){
  if(zbarScanner) return true;
  try{
    // zbar.jsがwindow.ZBarWasmを提供する
    const { ZBarScanner } = await window.ZBarWasm;
    zbarScanner = await ZBarScanner.create();
    return true;
  }catch(e){
    console.error('ZBar初期化失敗:', e);
    return false;
  }
}

async function toggleCamera(){
  if(cameraActive){ stopCamera(); return; }
  try{
    showToast('📷 初期化中...');

    // ZBar初期化
    const ok = await initZBar();
    if(!ok){ showToast('スキャナーの初期化に失敗しました'); return; }

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

    // オフスクリーンキャンバス（フレーム解析用）
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
    // ビデオフレームをキャンバスに描画
    scanCanvas.width = vid.videoWidth;
    scanCanvas.height = vid.videoHeight;
    scanCtx.drawImage(vid, 0, 0);

    // ZBarでデコード
    const imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
    const results = await zbarScanner.scanRGBAImage(
      imageData.data, imageData.width, imageData.height
    );

    if(results.length > 0){
      const code = results[0].decode();
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

  // 約150msごとにスキャン（CPU負荷とのバランス）
  scanAnimFrame = setTimeout(scanLoop, 150);
}

function stopCamera(){
  if(scanAnimFrame){ clearTimeout(scanAnimFrame); scanAnimFrame=null; }
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
