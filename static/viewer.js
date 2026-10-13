const ui = {
      list: document.getElementById('page-list'),
      count: document.getElementById('page-count'),
      current: document.getElementById('current-page'),
      size: document.getElementById('current-size'),
      previous: document.getElementById('previous'),
      next: document.getElementById('next'),
      sourceLabel: document.getElementById('source-label'),
      sourceViewport: document.getElementById('source-viewport'),
      renderViewport: document.getElementById('render-viewport'),
      sourceShell: document.getElementById('source-shell'),
      renderShell: document.getElementById('render-shell'),
      sourceImage: document.getElementById('source-image'),
      renderImage: document.getElementById('render-image'),
      renderEmpty: document.getElementById('render-empty'),
    };

    const state = { pages: [], index: 0 };

    function pageButton(page, index) {
      const button = document.createElement('button');
      button.className = 'page-item';
      button.type = 'button';
      button.dataset.index = String(index);
      button.setAttribute('aria-current', index === state.index ? 'true' : 'false');
      const thumb = document.createElement('img');
      thumb.className = 'thumb';
      thumb.src = page.imageUrl;
      thumb.alt = '';
      thumb.loading = 'lazy';
      const details = document.createElement('span');
      const name = document.createElement('span');
      name.className = 'page-name';
      name.textContent = page.id;
      const size = document.createElement('span');
      size.className = 'page-meta';
      size.textContent = `${page.width} × ${page.height}`;
      details.append(name, size);
      const status = document.createElement('span');
      status.className = `status-dot ${page.hasRender ? '' : 'missing'}`;
      status.setAttribute('aria-label', page.hasRender ? '已有渲染图' : '缺少渲染图');
      button.append(thumb, details, status);
      button.addEventListener('click', () => selectPage(index));
      return button;
    }

    function renderPageList() {
      ui.list.replaceChildren(...state.pages.map(pageButton));
      ui.count.textContent = `${state.pages.length} 页`;
    }

    function updateSelection() {
      ui.list.querySelectorAll('.page-item').forEach((button, index) => {
        button.setAttribute('aria-current', index === state.index ? 'true' : 'false');
      });
      const active = ui.list.querySelector(`[data-index="${state.index}"]`);
      active?.scrollIntoView({ block: 'nearest' });
    }

    function scaleFor(page) {
      const availableWidth = Math.min(
        ui.sourceViewport.clientWidth,
        ui.renderViewport.clientWidth
      ) - 24;
      const availableHeight = Math.min(
        ui.sourceViewport.clientHeight,
        ui.renderViewport.clientHeight
      ) - 24;
      return Math.max(
        0.05,
        Math.min(availableWidth / page.width, availableHeight / page.height)
      );
    }

    function applyScale() {
      const page = state.pages[state.index];
      if (!page) return;
      const scale = scaleFor(page);
      [ui.sourceShell, ui.renderShell].forEach(shell => {
        shell.style.width = `${page.width * scale}px`;
        shell.style.height = `${page.height * scale}px`;
      });
      [ui.sourceImage, ui.renderImage].forEach(content => {
        content.style.width = `${page.width}px`;
        content.style.height = `${page.height}px`;
        content.style.transform = `scale(${scale})`;
      });
    }

    function selectPage(index) {
      if (!state.pages.length) return;
      state.index = Math.max(0, Math.min(index, state.pages.length - 1));
      const page = state.pages[state.index];
      ui.current.textContent = `页面 ${page.id}`;
      ui.size.textContent = `${page.width} × ${page.height} px`;
      ui.sourceLabel.textContent = page.filename;
      ui.sourceImage.src = page.imageUrl;
      ui.sourceImage.alt = `数据集原图 ${page.id}`;
      ui.renderEmpty.hidden = page.hasRender;
      ui.renderShell.hidden = !page.hasRender;
      // Always fetch the current generated.png bytes instead of reusing a
      // browser-cached image from an earlier pipeline run.
      const cacheBust = location.protocol.startsWith('http') ? `?v=${Date.now()}` : '';
      ui.renderImage.src = page.hasRender ? `${page.renderUrl}${cacheBust}` : '';
      ui.renderImage.alt = page.hasRender ? `HTML 渲染图 ${page.id}` : '';
      ui.previous.disabled = state.index === 0;
      ui.next.disabled = state.index === state.pages.length - 1;
      updateSelection();
      requestAnimationFrame(applyScale);
    }
    ui.previous.addEventListener('click', () => selectPage(state.index - 1));
    ui.next.addEventListener('click', () => selectPage(state.index + 1));
    window.addEventListener('resize', applyScale);
    window.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') selectPage(state.index - 1);
      if (event.key === 'ArrowRight') selectPage(state.index + 1);
    });

    Promise.resolve(window.VIEWER_PAGES)
      .then(pages => {
        if (!Array.isArray(pages) || !pages.length) throw new Error('没有可展示的页面');
        state.pages = pages;
        renderPageList();
        selectPage(0);
      })
      .catch(error => {
        const message = document.createElement('div');
        message.className = 'error';
        message.textContent = `加载失败：${error.message}`;
        document.querySelector('.main').replaceChildren(message);
      });
