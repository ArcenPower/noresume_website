/* NoResume static page runtime (6 Oct 2026).
 * The pages were designed in Claude Design, whose runtime draws every page in the browser with React (from unpkg).
 * The static build (build_static.py) saves each page already drawn; this small file then runs the page's own
 * behaviour code (its `class Component extends DCLogic`) against that HTML, standing in for React:
 *   - refs:      elements marked data-ref="nameRef" fill this.nameRef.current
 *   - events:    data-on="click:openMenu;..." call the matching function from renderVals()
 *   - state:     setState() re-applies the bindings the template had:
 *                data-if="cond" (shown/hidden blocks), data-b-<attr>="template" (attributes), data-t="template" (text);
 *                templates use [[ name ]] where the design used {{ name }}
 * No React, no downloads: the page is visible as soon as the HTML arrives.
 */
(function () {
  'use strict';
  var NR = window.NR = {};

  function resolve(vals, path) {
    path = String(path).trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var v = vals;
    path.split('.').forEach(function (k) { v = v == null ? undefined : v[k]; });
    return v;
  }
  // templates are kept with [[ ]] instead of {{ }} so the design runtime left them alone when the page was saved
  function fill(tpl, vals) {
    var whole = tpl.match(/^\s*\[\[([\s\S]+?)\]\]\s*$/);
    if (whole) return resolve(vals, whole[1]);
    return tpl.replace(/\[\[([\s\S]+?)\]\]/g, function (_, p) { var v = resolve(vals, p); return v == null ? '' : String(v); });
  }
  function kebab(k) { return k.indexOf('--') === 0 ? k : k.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }); }
  function setStyle(el, v) {
    if (v == null) return;
    if (typeof v === 'string') {
      v.split(';').forEach(function (decl) {
        var i = decl.indexOf(':'); if (i < 0) return;
        el.style.setProperty(decl.slice(0, i).trim(), decl.slice(i + 1).trim());
      });
    } else if (typeof v === 'object') {
      Object.keys(v).forEach(function (k) { el.style.setProperty(kebab(k), v[k] == null ? '' : String(v[k])); });
    }
  }
  var BOOL = { disabled: 1, checked: 1, hidden: 1, readonly: 1, required: 1, selected: 1 };

  function vals(c) {
    var r = {};
    try { r = c.renderVals ? (c.renderVals() || {}) : {}; } catch (e) { console.error(e); }
    return Object.assign({}, c.props || {}, r);
  }

  // Shown/hidden blocks keep their markup in a <template> and are only added to the page while shown (and removed
  // when hidden), as the design runtime did: a hidden YouTube player or menu is not loaded until it is opened.
  NR.wire = function (c, scope) {
    var v = vals(c);
    var q = function (sel) { var l = Array.prototype.slice.call(scope.querySelectorAll(sel)); if (scope.matches && scope.matches(sel)) l.unshift(scope); return l; };
    q('[data-ref]').forEach(function (el) {
      var name = el.getAttribute('data-ref'), r = c[name] || v[name];
      if (r && typeof r === 'object' && 'current' in r) r.current = el;
    });
    q('[data-on]').forEach(function (el) {
      el.getAttribute('data-on').split(';').forEach(function (pair) {
        var p = pair.split(':'); if (p.length < 2) return;
        el.addEventListener(p[0], function (e) {
          var f = vals(c)[p[1]];
          if (typeof f === 'function') return f(e);
        });
      });
    });
  };
  function ifBlocks(c, v) {
    var changed = false;
    document.querySelectorAll('[data-if]').forEach(function (el) {
      var on = !!resolve(v, el.getAttribute('data-if'));
      el.setAttribute('data-if-on', String(on));
      var tpl = null;
      for (var k = 0; k < el.children.length; k++) if (el.children[k].tagName === 'TEMPLATE') { tpl = el.children[k]; break; }
      if (!tpl) return;
      var mounted = el.getAttribute('data-mounted') === '1';
      if (on && !mounted) {
        var frag = tpl.content.cloneNode(true), added = Array.prototype.slice.call(frag.childNodes);
        el.appendChild(frag); el.setAttribute('data-mounted', '1');
        added.forEach(function (n) { if (n.nodeType === 1) NR.wire(c, n); });
        changed = true;
      } else if (!on && mounted) {
        Array.prototype.slice.call(el.querySelectorAll('[data-ref]')).forEach(function (r) {
          var ref = c[r.getAttribute('data-ref')]; if (ref && ref.current === r) ref.current = null;
        });
        Array.prototype.slice.call(el.childNodes).forEach(function (n) { if (n !== tpl) el.removeChild(n); });
        el.setAttribute('data-mounted', '0');
        changed = true;
      }
    });
    return changed;
  }

  NR.apply = function (c) {
    var v = vals(c);
    for (var pass = 0; pass < 5 && ifBlocks(c, v); pass++) {}
    document.querySelectorAll('[data-t]').forEach(function (el) {
      var t = fill(el.getAttribute('data-t'), v); t = t == null ? '' : String(t);
      if (el.textContent !== t) el.textContent = t;
    });
    var all = document.querySelectorAll('*');
    for (var n = 0; n < all.length; n++) {
      var el = all[n], attrs = el.attributes;
      for (var i = 0; i < attrs.length; i++) {
        var a = attrs[i];
        if (a.name.indexOf('data-b-') !== 0) continue;
        var name = a.name.slice(7), val = fill(a.value, v);
        if (name === 'style') setStyle(el, val);
        else if (BOOL[name]) { if (val) el.setAttribute(name, ''); else el.removeAttribute(name); el[name] = !!val; }
        else if (name === 'value') { if (el.value !== String(val == null ? '' : val)) el.value = val == null ? '' : val; }
        else if (val == null || val === false) el.removeAttribute(name);
        else el.setAttribute(name, val === true ? '' : String(val));
      }
    }
  };

  window.React = window.React || {
    createRef: function () { return { current: null }; },
    Fragment: 'nr-fragment'
  };
  window.DCLogic = window.StreamableLogic = class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(update, cb) {
      var patch = typeof update === 'function' ? update(this.state, this.props) : update;
      if (patch) this.state = Object.assign({}, this.state, patch);
      NR.apply(this);
      if (cb) cb.call(this);
    }
    forceUpdate(cb) { NR.apply(this); if (cb) cb.call(this); }
    componentDidMount() {}
    componentWillUnmount() {}
    renderVals() { return {}; }
  };

  NR.boot = function (Cls, props) {
    var c = new Cls(props || {});
    c.state = c.state || {};
    NR.wire(c, document.documentElement);  // refs + events (renderVals may create refs lazily)
    NR.apply(c);
    try { c.componentDidMount(); } catch (e) { console.error(e); }
    window.addEventListener('pagehide', function () { try { c.componentWillUnmount(); } catch (e) {} });
    NR.page = c;
    return c;
  };
})();
