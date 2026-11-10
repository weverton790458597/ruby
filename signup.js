/* signup.js — link "Crie a sua página também" + modal de contratação. */
(function () {
  var FN = 'https://abdliioyzkylccfylils.supabase.co/functions/v1/hubbio-checkout';
  var KEY = 'sb_publishable_g6l6_QmwE4Tj85_KF_XHfQ_I4gFlY_n';
  var ROOT = 'hubbio.shop';
  var $ = function (s, r) { return (r || document).querySelector(s); };

  // ---- CSS do que é novo ----
  var st = document.createElement('style');
  st.textContent =
    '.crie{text-align:center;margin:40px auto 0;max-width:440px}' +
    '.crie button{background:none;border:0;border-bottom:1px solid var(--ruby);color:var(--mute);font:inherit;font-size:11px;letter-spacing:.22em;text-transform:uppercase;padding:6px 2px;cursor:pointer;min-height:44px}' +
    '.crie button:hover,.crie button:focus-visible{color:var(--white)}' +
    '#sg .box{max-width:440px;max-height:calc(100dvh - 32px);overflow-y:auto;margin:auto}' +
    '#sg .sub{display:flex;align-items:center}#sg .sub .in{flex:1}#sg .sub b{padding:0 0 0 8px;color:var(--mute);font-weight:400;letter-spacing:0;text-transform:none}' +
    '#sg .two{display:grid;grid-template-columns:1fr 1fr;gap:8px}#sg .ok{color:#6fd39b}';
  document.head.appendChild(st);

  // ---- Link no rodapé ----
  var p = document.createElement('p');
  p.className = 'crie';
  p.innerHTML = '<button type="button" id="sgOpen">Crie a sua página também</button>';
  var app = $('#app'); app.parentNode.insertBefore(p, app.nextSibling);

  // ---- Modal ----
  var m = document.createElement('div');
  m.id = 'sg'; m.className = 'veil'; m.hidden = true;
  var rows = '';
  for (var i = 0; i < 4; i++) rows += '<div class="two"><input class="in" data-t="' + i + '" placeholder="Título do link ' + (i + 1) + '" maxlength="60"><input class="in" data-u="' + i + '" placeholder="https://..." inputmode="url" autocapitalize="off"></div>';
  m.innerHTML =
    '<form class="box" id="sgForm" autocomplete="off"><h2>Crie a sua página</h2>' +
    '<p>Sua bio no ar em minutos, logo após a confirmação do pagamento.</p>' +
    '<label class="lbl">Endereço desejado<span class="sub"><input class="in" id="sgSub" maxlength="30" autocapitalize="off" required><b>.' + ROOT + '</b></span></label>' +
    '<p class="msg" id="sgSubMsg" role="status"></p>' +
    '<label class="lbl">Nome na página<input class="in" id="sgName" maxlength="60" required></label>' +
    '<label class="lbl">Descrição<input class="in" id="sgTag" maxlength="200"></label>' +
    '<label class="lbl">Foto<input type="file" id="sgPhoto" accept="image/*"></label>' + rows +
    '<label class="lbl">Redes (uma URL por linha, até 4)<textarea class="in" id="sgSoc" rows="3" placeholder="https://instagram.com/..."></textarea></label>' +
    '<label class="lbl">Texto do rodapé<input class="in" id="sgFoot" maxlength="120"></label>' +
    '<label class="lbl">Orientação para a IA (opcional)<textarea class="in" id="sgPrompt" rows="2" maxlength="600" placeholder="Ex.: visual rosa e minimalista"></textarea></label>' +
    '<div class="two"><label class="lbl">Seu nome<input class="in" id="sgNome" required></label><label class="lbl">CPF/CNPJ<input class="in" id="sgDoc" inputmode="numeric" required></label></div>' +
    '<label class="lbl">E-mail<input class="in" id="sgMail" type="email" required></label>' +
    '<p class="msg" id="sgMsg" role="status"></p>' +
    '<div class="row"><button class="btn pri" id="sgGo" type="submit">Ir para o pagamento</button><button class="btn" id="sgX" type="button">Cancelar</button></div></form>';
  document.body.appendChild(m);

  // Chamada à Edge Function. Lê o corpo como texto para nunca quebrar se vier algo que não é JSON.
  function api(body) {
    return fetch(FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.text().then(function (txt) {
        var d = {};
        try { d = txt ? JSON.parse(txt) : {}; } catch (e) { d = {}; }
        if (!r.ok) throw new Error(d.error || d.message || 'Erro ' + r.status + '. Tente novamente.');
        return d;
      });
    }, function () { throw new Error('Sem conexão. Verifique a internet e tente de novo.'); });
  }
  function say(el, t, cls) { el.textContent = t; el.className = 'msg' + (cls ? ' ' + cls : ''); }

  $('#sgOpen').onclick = function () { m.hidden = false; $('#sgSub').focus(); };
  $('#sgX').onclick = function () { m.hidden = true; };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') m.hidden = true; });

  // ---- Validador visual do subdomínio (com debounce) ----
  var tm, subOk = false;
  $('#sgSub').addEventListener('input', function (e) {
    var v = e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    var out = $('#sgSubMsg'); subOk = false; clearTimeout(tm);
    if (v.length < 3) { say(out, 'Mínimo de 3 caracteres.'); return; }
    say(out, 'Verificando...');
    tm = setTimeout(function () {
      api({ action: 'check', subdomain: v }).then(function (d) {
        if (v !== $('#sgSub').value) return; // resposta antiga
        subOk = d.available;
        say(out, d.available ? '✓ ' + v + '.' + ROOT + ' está disponível' : (d.reason || 'Indisponível'), d.available ? 'ok' : 'err');
      }).catch(function () {
        if (v === $('#sgSub').value) say(out, 'Não foi possível verificar agora.', 'err');
      });
    }, 400);
  });

  // ---- Foto: recorte quadrado 256px em JPEG ----
  var avatar = '', photoBusy = false;
  $('#sgPhoto').onchange = function (e) {
    var f = e.target.files[0]; avatar = '';
    if (!f) return;
    photoBusy = true;
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = c.height = 256;
        var s = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
        avatar = c.toDataURL('image/jpeg', 0.85);
        photoBusy = false;
      };
      img.onerror = function () { photoBusy = false; };
      img.src = fr.result;
    };
    fr.onerror = function () { photoBusy = false; };
    fr.readAsDataURL(f);
  };

  // ---- Envio ----
  $('#sgForm').onsubmit = function (e) {
    e.preventDefault();
    var msg = $('#sgMsg'), go = $('#sgGo');
    if (!subOk) { say(msg, 'Escolha um endereço disponível.', 'err'); return; }
    if (photoBusy) { say(msg, 'Aguarde o processamento da foto e tente de novo.', 'err'); return; }
    var links = [];
    for (var i = 0; i < 4; i++) {
      var t = $('[data-t="' + i + '"]').value.trim(), u = $('[data-u="' + i + '"]').value.trim();
      if (t && u) links.push({ title: t, url: /^https?:\/\//i.test(u) ? u : 'https://' + u });
    }
    var social = $('#sgSoc').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4)
      .map(function (u) { return /^https?:\/\//i.test(u) ? u : 'https://' + u; });
    go.disabled = true; say(msg, 'Criando seu checkout...');

    api({
      action: 'create',
      subdomain: $('#sgSub').value,
      nome: $('#sgNome').value,
      email: $('#sgMail').value,
      cpfCnpj: $('#sgDoc').value,
      prompt: $('#sgPrompt').value,
      config: { name: $('#sgName').value, tagline: $('#sgTag').value, footer: $('#sgFoot').value, avatar: avatar, links: links, social: social }
    }).then(function (d) {
      if (!d.url) throw new Error('Não recebemos o link de pagamento. Tente novamente.');
      location.href = d.url;
    }).catch(function (err) { go.disabled = false; say(msg, err.message, 'err'); });
  };
})();
