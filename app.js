/* ===== Bone & Skeletal Histology Quiz — engine ===== */
(function(){
  const {SECTIONS, QUESTIONS, SLIDES, slideImg, slideView} = window.QUIZ;
  const LETTERS = ['A','B','C','D','E'];
  const $ = s => document.querySelector(s);

  // Normalise slide questions into the common shape
  const slideQuestions = SLIDES.map(s => ({
    q: s.q, o: s.o, a: s.a, isSlide: true,
    dir: s.dir, thumbDir: s.thumbDir || s.dir, viewerN: s.viewerN || 1,
    tag: s.cat
  }));
  const mcq = QUESTIONS.map((q,i) => ({...q, num:i+1, tag:'Question ' + (i+1)}));

  // Pinned warm-up — always question 1, every option is Dave, and Dave is correct.
  const DAVE = {
    q:'Who is the coolest person in this class?',
    o:['Dave','Dave','Dave','Dave','Dave'],
    a:0, anyCorrect:true, tag:'Warm-up'
  };

  // correctness helper (handles the all-Dave question where any pick is right)
  const isCorrect = (q,pick) => pick!==null && (q.anyCorrect ? true : pick===q.a);

  const MODES = [
    {id:'full',  ic:'📚', title:'Full Quiz',     desc:'All 150 lecture questions',                  count:'150 Q'},
    {id:'slides',ic:'🔬', title:'Slide ID Round', desc:'Identify real slides + bone cells',           count:slideQuestions.length+' Q'},
    {id:'p1',    ic:'🦴', title:'Part 1',         desc:'Anatomy, growth & calcium homeostasis',      count:'50 Q'},
    {id:'p2',    ic:'🧬', title:'Part 2',         desc:'Cell lineages, ossification & fractures',    count:'50 Q'},
    {id:'p3',    ic:'🦵', title:'Part 3',         desc:'Matrix, histology, fractures & joints',      count:'50 Q'},
    {id:'mega',  ic:'🏆', title:'The Whole Thing', desc:'150 questions + the slide round',           count:(150+slideQuestions.length)+' Q'}
  ];

  function poolFor(id){
    switch(id){
      case 'full':   return mcq.slice();
      case 'slides': return slideQuestions.slice();
      case 'p1':     return mcq.filter(q=>q.s===1);
      case 'p2':     return mcq.filter(q=>q.s===2);
      case 'p3':     return mcq.filter(q=>q.s===3);
      case 'mega':   return mcq.concat(slideQuestions);
    }
  }

  const state = {list:[], i:0, picks:[], instant:true, mode:'full'};

  // build the question list for a mode, with Dave always pinned first
  function buildList(modeId){
    let list = poolFor(modeId);
    if($('#opt-shuffle').checked) list = shuffle(list.slice());
    else list = list.slice();
    list.unshift(DAVE);
    return list;
  }

  /* ---------- start screen ---------- */
  function buildModes(){
    const grid = $('#mode-grid');
    grid.innerHTML = '';
    MODES.forEach(m=>{
      const b = document.createElement('button');
      b.className='mode';
      b.innerHTML = `<span class="count">${m.count}</span><span class="ic">${m.ic}</span>
        <h3>${m.title}</h3><p>${m.desc}</p>`;
      b.onclick = ()=>startQuiz(m.id);
      grid.appendChild(b);
    });
    // add SVG gradient def used by the score ring
    const svg = document.querySelector('.score-ring svg');
    if(svg && !svg.querySelector('defs')){
      const ns='http://www.w3.org/2000/svg';
      const defs=document.createElementNS(ns,'defs');
      defs.innerHTML='<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'+
        '<stop offset="0%" stop-color="#7c5cff"/><stop offset="55%" stop-color="#ff5d9e"/>'+
        '<stop offset="100%" stop-color="#22d3ee"/></linearGradient>';
      svg.insertBefore(defs, svg.firstChild);
    }
  }

  function shuffle(a){
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }

  function startQuiz(modeId){
    state.mode = modeId;
    state.list = buildList(modeId);
    state.i = 0;
    state.picks = new Array(state.list.length).fill(null);
    state.instant = $('#opt-instant').checked;
    show('quiz');
    render();
  }

  /* ---------- screen switching ---------- */
  function show(name){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    $('#screen-'+name).classList.add('active');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  /* ---------- render a question ---------- */
  function render(isNew){
    const q = state.list[state.i];
    const n = state.list.length;
    if(isNew !== false){ // replay card entrance animation on a new question
      const c = $('#question-card');
      c.classList.remove('q-anim'); void c.offsetWidth; c.classList.add('q-anim');
    }
    $('#q-counter').textContent = `${state.i+1} / ${n}`;
    const correctSoFar = state.picks.filter((p,idx)=>isCorrect(state.list[idx],p)).length;
    $('#q-score').textContent = `${correctSoFar} correct`;
    $('#progress-fill').style.width = ((state.i)/n*100)+'%';

    $('#q-tag').textContent = q.tag || '';
    $('#q-text').textContent = q.q;

    // slide block
    const box = $('#slide-box');
    if(q.isSlide){
      box.hidden=false;
      const img = slideImg(q.thumbDir);
      const view = slideView(q.dir, q.viewerN);
      box.innerHTML = `
        <div class="slide-frame"><img src="${img}" alt="Histology slide to identify" loading="lazy"></div>
        <div class="slide-actions">
          <a class="slide-link" href="${view}" target="_blank" rel="noopener">🔬 Open zoomable slide ↗</a>
          <button class="ghost-btn" type="button" id="btn-embed" style="padding:9px 14px;font-size:.85rem">Examine here ▾</button>
          <span class="slide-hint">Zoom in to inspect the cells &amp; matrix.</span>
        </div>
        <div class="slide-embed" id="slide-embed" hidden><iframe src="${view}" title="Virtual microscope viewer" loading="lazy"></iframe></div>`;
      box.querySelector('#btn-embed').onclick = (e)=>{
        const em = box.querySelector('#slide-embed');
        em.hidden = !em.hidden;
        e.target.textContent = em.hidden ? 'Examine here ▾' : 'Hide viewer ▴';
      };
    } else {
      box.hidden=true; box.innerHTML='';
    }

    // answers
    const wrap = $('#answers');
    wrap.innerHTML='';
    const picked = state.picks[state.i];
    q.o.forEach((opt,idx)=>{
      const b=document.createElement('button');
      b.className='answer';
      b.innerHTML=`<span class="key">${LETTERS[idx]}</span><span>${opt}</span>`;
      b.onclick=()=>choose(idx);
      if(picked!==null){
        b.classList.add('locked');
        if(state.instant){
          if(q.anyCorrect){
            if(idx===picked) b.classList.add('correct'); else b.classList.add('dim');
          } else if(idx===q.a) b.classList.add('correct');
          else if(idx===picked) b.classList.add('wrong');
          else b.classList.add('dim');
        } else if(idx===picked){ b.classList.add('selected'); }
      }
      wrap.appendChild(b);
    });

    // feedback — the Dave message always shows when answered; normal feedback honours the toggle
    const fb=$('#feedback');
    if(picked!==null && q.anyCorrect){
      fb.hidden=false;
      fb.className='feedback dave';
      fb.textContent = '✓ You are a very smart person, but that question was really easy, given that Dave is always the coolest person where ever he goes. Let me just say you are really lucky to be in a class with him — I know I wish I was!';
    } else if(picked!==null && state.instant){
      const ok = isCorrect(q,picked);
      fb.hidden=false;
      fb.className='feedback '+(ok?'ok':'no');
      fb.textContent = ok ? '✓ Correct!' : `✗ Not quite — the answer is ${LETTERS[q.a]}: ${q.o[q.a]}`;
    } else { fb.hidden=true; }

    // nav state
    $('#btn-next').textContent = (state.i===n-1)?'Finish ✓':'Next →';
    $('#btn-next').disabled = (picked===null);
    $('#btn-skip').style.visibility = (state.i===n-1)?'hidden':'visible';
  }

  function choose(idx){
    const already = state.picks[state.i]!==null;
    if(already && state.instant) return; // locked once answered in instant mode
    const wasUnanswered = state.picks[state.i]===null;
    state.picks[state.i]=idx;
    if(wasUnanswered && state.list[state.i].anyCorrect) confetti(70); // Dave gets a celebration
    render(false);
  }

  /* ---------- confetti ---------- */
  function confetti(count){
    const host = document.getElementById('confetti');
    if(!host) return;
    const colors=['#8b5cff','#22d3ee','#ff5d9e','#ffcf5c','#34d399'];
    for(let i=0;i<count;i++){
      const bit=document.createElement('span');
      bit.className='confetti-bit';
      bit.style.left=Math.random()*100+'vw';
      bit.style.background=colors[i%colors.length];
      bit.style.animationDuration=(1.6+Math.random()*1.6)+'s';
      bit.style.animationDelay=(Math.random()*.35)+'s';
      bit.style.transform=`scale(${0.7+Math.random()*0.9})`;
      bit.style.opacity=String(0.7+Math.random()*0.3);
      host.appendChild(bit);
      setTimeout(()=>bit.remove(),3600);
    }
  }

  /* ---------- navigation ---------- */
  function next(){
    if(state.picks[state.i]===null) return;
    if(state.i < state.list.length-1){ state.i++; render(); }
    else finish();
  }
  function skip(){
    if(state.i < state.list.length-1){ state.i++; render(); }
  }

  /* ---------- results ---------- */
  function finish(){
    const total=state.list.length;
    const correct=state.picks.filter((p,idx)=>isCorrect(state.list[idx],p)).length;
    const pct=Math.round(correct/total*100);
    show('results');
    $('#progress-fill').style.width='100%';

    $('#score-pct').textContent=pct+'%';
    $('#score-frac').textContent=`${correct} / ${total}`;
    // animate ring
    const ring=$('#ring-fg'); const circ=2*Math.PI*52;
    ring.style.strokeDasharray=circ;
    ring.style.strokeDashoffset=circ;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      ring.style.strokeDashoffset = circ*(1-correct/total);
    }));

    let title, msg;
    if(pct===100){title='Flawless. 🧠💯';msg="Every single one. You clearly own this material.";}
    else if(pct>=85){title='Dialed in. 🔥';msg="Strong command of the skeletal system — just polish the edge cases.";}
    else if(pct>=70){title='Solid work. 💪';msg="You’ve got the fundamentals. Review the misses and run it back.";}
    else if(pct>=50){title='Getting there. 📈';msg="Halfway home. Hit the review below and try again.";}
    else {title='Study session time. 📚';msg="No stress — review the answers below, then take another pass.";}
    $('#result-title').textContent=title;
    $('#result-msg').textContent=msg;
    if(pct>=70) setTimeout(()=>confetti(pct>=90?140:90), 350);

    buildReview();
    $('#review-list').hidden=true;
  }

  function buildReview(){
    const list=$('#review-list');
    list.innerHTML='';
    state.list.forEach((q,idx)=>{
      const pick=state.picks[idx];
      const ok = isCorrect(q,pick);
      const el=document.createElement('div');
      el.className='rev';
      const youLine = pick===null
        ? `<div class="ra you-wrong">Skipped</div>`
        : (ok ? '' : `<div class="ra you-wrong">Your answer — ${LETTERS[pick]}: ${q.o[pick]}</div>`);
      const correctLine = q.anyCorrect
        ? `<div class="ra correct">Correct — Dave (obviously)</div>`
        : `<div class="ra correct">Correct — ${LETTERS[q.a]}: ${q.o[q.a]}</div>`;
      el.innerHTML=`<div class="num">${ok?'✓':'✗'} ${q.tag||('Q'+(idx+1))}</div>
        <div class="rq">${q.q}</div>
        ${youLine}
        ${correctLine}`;
      list.appendChild(el);
    });
  }

  /* ---------- wire up ---------- */
  function init(){
    buildModes();
    $('#btn-next').onclick=next;
    $('#btn-skip').onclick=skip;
    $('#btn-quit').onclick=()=>{ if(confirm('Exit this quiz? Progress will be lost.')) show('start'); };
    $('#btn-review').onclick=()=>{
      const rl=$('#review-list'); rl.hidden=!rl.hidden;
      $('#btn-review').textContent = rl.hidden?'Review answers':'Hide review';
      if(!rl.hidden) rl.scrollIntoView({behavior:'smooth'});
    };
    $('#btn-retry').onclick=()=>{ state.list=buildList(state.mode); state.i=0;
      state.picks=new Array(state.list.length).fill(null); show('quiz'); render(); };
    $('#btn-home').onclick=()=>show('start');

    // keyboard: 1-5 / A-E to answer, Enter for next
    document.addEventListener('keydown',e=>{
      if(!$('#screen-quiz').classList.contains('active')) return;
      const q=state.list[state.i]; if(!q) return;
      const k=e.key.toLowerCase();
      const map={'1':0,'2':1,'3':2,'4':3,'5':4,'a':0,'b':1,'c':2,'d':3,'e':4};
      if(k in map && map[k]<q.o.length){ choose(map[k]); }
      else if(e.key==='Enter' && !$('#btn-next').disabled){ next(); }
    });
  }

  init();
})();
