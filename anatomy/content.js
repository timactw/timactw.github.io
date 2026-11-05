// Article content (Traditional Chinese, Taiwan wording). Every fact carries a numbered source [n] listed at the bottom.
const R = (n) => `<sup><a href="#ref${n}" aria-label="來源 ${n}">[${n}]</a></sup>`;
const V = (ids, label, dir) => `<button class="btn ghost view3d" data-view="${ids}"${dir ? ` data-dir="${dir}"` : ''}>🔍 ${label}</button>`;

export const FORENSICS_HTML = `
<div class="wrap">
<h1>法醫入門：骨頭會說話</h1>
<p class="lead">這一篇介紹法醫和法醫人類學怎麼從骨頭和牙齒得到線索。內容只談科學方法，不談真實案件，也沒有任何遺體照片。按「在 3D 裡看」可以跳到模型上的對應骨頭。</p>

<h2>1. 為什麼骨頭這麼重要？</h2>
<p>法醫人類學家研究的是人類遺骸，通常是骨頭。他們要判斷這個人是誰、生前怎麼生活，有時也包括怎麼死亡${R(1)}。同一套方法也能用在幾千年前的古代骨骸上，幫助考古學家了解過去的人${R(1)}。</p>
<p>從骨骼通常會先建立一份「生物檔案」：<b>年齡、性別、身高</b>，再加上骨頭上的特殊痕跡。舉例來說，骨折如果已經癒合、重新長好，就代表這個人受傷後又活了一段時間${R(1)}。</p>

<h2>2. 用股骨推估身高</h2>
<p>長骨的長度和身高有關，所以研究者用實際測量的資料建立「迴歸公式」，從骨頭長度推算身高。最常被引用的一組是 Trotter 與 Gleser 在 1952 年發表的公式，其中用股骨推估美國白人男性身高的式子是${R(2)}：</p>
<div class="box">
<div class="formula">身高（公分）＝ 2.38 × 股骨長（公分）＋ 61.41</div>
<p style="font-size:15px;color:var(--mut);margin:0">（Trotter &amp; Gleser, 1952；適用族群：美國白人男性。式子本身另有幾公分的誤差範圍。）</p>
</div>
<p><b>重要：公式跟族群有關。</b>Trotter 與 Gleser 對不同族群、不同性別分別算出不同的公式；也有研究發現，用某個族群建立的公式套到另一個族群，結果會不準${R(3)}。所以臺灣也有研究者用臺灣成人的 X 光影像，另外建立從六種長骨推估身高的公式${R(4)}。</p>
<div class="box">
<p style="margin-top:0"><b>動手算算看：</b>這個 3D 模型的左股骨長約 <b class="meta-femur">–</b> 公分，模型身高約 <b class="meta-height">–</b> 公分。代入公式會得到 <b class="meta-est">–</b> 公分。你也可以輸入別的長度：</p>
<div class="calc"><label for="femurIn">股骨長（公分）</label><input id="femurIn" type="number" inputmode="decimal" step="0.1" min="20" max="70"><span>→ 推估身高</span><output id="statureOut">—</output></div>
<p style="font-size:15px;color:var(--mut)">（模型的股骨長是本網站程式沿骨頭最長方向量出來的，只是示範，不是正式測量方法。）</p>
${V('femur_L,femur_R', '在 3D 裡看股骨')}
</div>

<h2>3. 骨盆和頭骨：男女有什麼不同？</h2>
<p>判斷成年人性別，最可靠的部位是骨盆，因為女性的骨盆要能讓胎兒通過${R(1)}。常見的差異${R(5)}：</p>
<table>
<tr><th>特徵</th><th>男性常見</th><th>女性常見</th></tr>
<tr><td>整體</td><td>較高、較窄、較緊實</td><td>較大、較寬</td></tr>
<tr><td>恥骨下角（兩側恥骨下緣的夾角）</td><td>較尖，約 70 度</td><td>較鈍，約 90–100 度</td></tr>
<tr><td>坐骨大切跡</td><td>較窄</td><td>較寬</td></tr>
<tr><td>骨盆入口</td><td>—</td><td>較大、較接近橢圓形</td></tr>
</table>
<div class="svgrow" role="img" aria-label="恥骨下角示意圖">
<figure><svg viewBox="0 0 200 150"><path class="bone" d="M30 20 L100 120 L170 20"/><path class="ang" d="M83 96 A30 30 0 0 1 117 96"/><text x="78" y="88">≈70°</text><text class="lab" x="100" y="145" text-anchor="middle">男性：角度較小</text></svg><figcaption>示意圖，非真實比例</figcaption></figure>
<figure><svg viewBox="0 0 200 150"><path class="bone" d="M10 50 L100 120 L190 50"/><path class="ang" d="M74 100 A33 33 0 0 1 126 100"/><text x="74" y="92">≈90–100°</text><text class="lab" x="100" y="145" text-anchor="middle">女性：角度較大</text></svg><figcaption>示意圖，非真實比例</figcaption></figure>
</div>
<p>這個 3D 模型取自一位成年男性的資料，所以只能看到「男性骨盆」的樣子。</p>
${V('hip_L,hip_R,sacrum', '在 3D 裡看骨盆（髖骨＋薦骨）', '0,-0.25,1')}
<p>如果找不到骨盆，也可以看頭骨：男性的眉弓（眉毛上方的骨脊）、後腦勺的項部骨脊、耳朵後方的乳突通常比較發達；女性則較平滑、較小，因為這些地方是肌肉附著的位置${R(1)}。</p>
${V('frontal,temporal_L,temporal_R,occipital,mandible', '在 3D 裡看頭骨', '0.8,0.1,0.6')}
<p>要注意：每個人都有個別差異，所以專家會觀察骨盆前面、側面等好幾個區域的特徵，綜合起來判斷，骨盆缺少時才改看頭骨等其他部位${R(1)}。</p>

<h2>4. 怎麼估計年齡？</h2>
<p><b>看牙齒：</b>從出生前到大約 20 出頭，牙齒一直在發育、萌出，所以牙齒是這段期間估計年齡最好的方法；年輕人的下頜骨裡如果還有沒長出來的牙齒，年齡可以估到大約一年的範圍內${R(1)}。</p>
${V('teeth_up_inc,teeth_up_can,teeth_up_pm,teeth_up_mol,teeth_lo_inc,teeth_lo_can,teeth_lo_pm,teeth_lo_mol,mandible', '在 3D 裡看牙齒和下頜骨')}
<p><b>看生長板：</b>長骨靠兩端的「生長板」（骨骺板）變長。長大到某個階段，生長板就會和骨幹癒合，身高也就不再增加${R(1)}。生長板完全癒合最常見在女生約 14–15 歲、男生約 15–17 歲，但個人差異很大${R(6)}。研究者知道不同部位大約在哪個年齡癒合，就能用「哪些已經癒合、哪些還沒」來推估年齡範圍${R(1)}。</p>
${V('femur_L,tibia_L,fibula_L,patella_L', '在 3D 裡看膝蓋附近的長骨末端', '0.4,0,1')}
<p style="color:var(--mut)">（3D 模型是成人，生長板已經癒合，所以看不到縫隙；這裡是讓你看位置。）</p>

<h2>5. 在臺灣當法醫師</h2>
<p><b>法務部法醫研究所</b>是負責法醫鑑定的政府機關。依照它的組織法，工作包括：身體、病理及死因的勘驗、檢驗、鑑定和研究；藥物與毒物的鑑定；刑事證物的鑑定；指導各地方檢察署的法醫業務；以及培訓法醫人員${R(7)}。</p>
<p>依照《法醫師法》，司法上的屍體解剖由法醫師來做；檢驗屍體則由法醫師或檢驗員來做${R(8)}。</p>
<p><b>怎麼成為法醫師？</b>要通過國家的法醫師考試。可以報考的途徑主要有兩種${R(8)}：</p>
<ul>
<li>大學的<b>法醫學研究所</b>畢業，並完成實習且成績及格。</li>
<li><b>醫學系、牙醫學系或中醫學系</b>畢業、考取醫師（牙醫師、中醫師）證書，再修習法醫學程並完成法醫實習，或接受一年以上的法醫專業訓練。</li>
</ul>
<p>臺灣大學醫學院就設有法醫學研究所（上面提到的臺灣身高公式研究，就是那裡的碩士論文）${R(4)}。</p>
<div class="box"><p style="margin:0">想往這條路走，國中、高中可以先把<b>生物、化學、英文</b>打好基礎；這個工作需要細心、耐心，以及對真相負責的態度。（這段是建議，不是引用的事實。）</p></div>

<h2 id="refs">資料來源</h2>
<ol class="refs">
<li id="ref1">Smithsonian National Museum of Natural History, “Video Transcript – Forensic Anthropology – Bone Whispering”（Live from Q?rius 教育節目逐字稿）. <a href="https://naturalhistory.si.edu/sites/default/files/media/file/video-transcript-forensic-anthropology-bone-whispering_0.pdf" target="_blank" rel="noopener">naturalhistory.si.edu（PDF）</a></li>
<li id="ref2">Jeong Y, Taylor RJ, Jung Y, Woo EJ (2023). Trotter and Gleser’s (1958) equations outperform Trotter and Gleser’s (1952) equations in stature estimation of the US White males. <i>Forensic Sciences Research</i> 8(1):16–23（表 1 列出 1952 股骨式 2.38 × Fem + 61.41）. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10265954/" target="_blank" rel="noopener">PMC10265954</a></li>
<li id="ref3">Wikipedia, “Estimation of stature”（各族群分別的 Trotter &amp; Gleser 公式；北方中國人公式套用於法國人不準的研究）. <a href="https://en.wikipedia.org/wiki/Estimation_of_stature" target="_blank" rel="noopener">en.wikipedia.org/wiki/Estimation_of_stature</a></li>
<li id="ref4">張正柏（2016）。《利用影像學資料建立台灣人由長骨推論身高相關性之公式》。國立臺灣大學醫學院法醫學科所碩士論文。 <a href="https://tdr.lib.ntu.edu.tw/handle/123456789/3889" target="_blank" rel="noopener">臺大學術典藏</a></li>
<li id="ref5">Wikipedia, “Pelvis”（Variation 一節：男女骨盆差異）. <a href="https://en.wikipedia.org/wiki/Pelvis" target="_blank" rel="noopener">en.wikipedia.org/wiki/Pelvis</a></li>
<li id="ref6">Wikipedia, “Epiphyseal plate”（生長板癒合年齡）. <a href="https://en.wikipedia.org/wiki/Epiphyseal_plate" target="_blank" rel="noopener">en.wikipedia.org/wiki/Epiphyseal_plate</a></li>
<li id="ref7">《法務部法醫研究所組織法》第 2 條（民國 112 年 1 月 13 日修正）。全國法規資料庫. <a href="https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0000033" target="_blank" rel="noopener">law.moj.gov.tw（I0000033）</a></li>
<li id="ref8">《法醫師法》第 4 條（應考資格）、第 9 條（檢驗、解剖屍體）（民國 108 年 4 月 24 日修正）。全國法規資料庫. <a href="https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0010052" target="_blank" rel="noopener">law.moj.gov.tw（I0010052）</a></li>
</ol>
<p style="font-size:14px;color:var(--mut)">資料查證日期：2026 年 11 月。法規可能修正，請以全國法規資料庫最新版本為準。</p>
</div>`;

export const ABOUT_HTML = `
<div class="wrap">
<h1>關於這個網站</h1>
<p class="lead">一個給國中生自學用的 3D 人體解剖工具。可以加到 iPad 主畫面，離線也能用。</p>

<h2>3D 模型資料來源與授權</h2>
<div class="box">
<p style="margin-top:0"><b>BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International</b></p>
<p>資料：BodyParts3D 4.0（is_a 版本 OBJ 檔），由日本 Database Center for Life Science（DBCLS）提供。<a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html" target="_blank" rel="noopener">BodyParts3D 下載頁</a>・<a href="https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html" target="_blank" rel="noopener">README（含授權說明）</a>・<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0 授權條款</a></p>
<p>說明：原始 OBJ 檔頭標示的是 CC BY-SA 2.1 JP；資料庫 README（2025 年 2 月更新）改為 CC BY 4.0。為了同時符合兩種標示，本網站的衍生模型以 <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a> 釋出。</p>
<p style="margin-bottom:0"><b>本網站做的修改：</b>把座標轉成公分、Y 軸朝上；把多個元件合併成一個部位（例如三束三角肌合成「三角肌」）；減面（降低多邊形數量）並用 meshopt 壓縮成 GLB。資料庫沒有肺的實體模型，所以<b>左右肺是依支氣管樹的外輪廓計算出來的近似形狀</b>，不是真實掃描。模型來自一位成年男性，沒有尾骨，牙齒沒有第三臼齒（智齒）；部分大肌肉（例如闊背肌、腹直肌、咀嚼肌）資料庫裡沒有，所以這裡也沒有。</p>
</div>

<h2>名詞</h2>
<p>中文解剖名詞以國家教育研究院「樂詞網」的「人體解剖學」與「醫學名詞」詞表為主（<a href="https://terms.naer.edu.tw/" target="_blank" rel="noopener">terms.naer.edu.tw</a>），詞表沒有收錄的則採用臺灣國中、高中生物課本常見說法（例如「腦幹」「食道」）。語言切換會改變部位名稱的顯示方式；部位說明只有中文。</p>

<h2>程式</h2>
<p>3D 顯示使用 <a href="https://threejs.org/" target="_blank" rel="noopener">three.js</a> r160（MIT 授權），已經放在網站裡面，不需要連到外部伺服器。</p>

<h2>隱私</h2>
<p>沒有帳號、沒有廣告、沒有追蹤或分析程式，也不會上傳任何資料。測驗成績和語言設定只存在這台裝置的瀏覽器裡（localStorage），按「清除成績紀錄」就會刪掉。</p>

<h2>加到主畫面</h2>
<p>在 iPad 的 Safari 打開這個網站 → 點分享按鈕 → 「加入主畫面」。第一次開啟後，模型會存在裝置上，之後沒有網路也能用。</p>
</div>`;
