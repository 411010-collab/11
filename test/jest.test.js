const fs = require('fs');
const path = require('path');

describe('Anime title matching (Jest)', () => {
  beforeAll(() => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

    // load HTML into jsdom-provided document
    document.documentElement.innerHTML = html;

    // extract inline scripts and execute them in the test environment
    const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let combinedScripts = '';
    while ((match = scriptRe.exec(html)) !== null) {
      const scriptContent = match[1];
      combinedScripts += '\n' + scriptContent;
      // execute in global scope and surface errors
      try {
        // use indirect eval to run in global scope so function declarations attach to global
        (0, eval)(scriptContent);
      } catch (e) {
        // rethrow with context so tests fail with useful info
        throw new Error('執行 index.html 內嵌腳本失敗: ' + e.message);
      }
    }

    // If functions aren't attached to global (due to module-like scoping),
    // attempt to extract their declarations and assign them explicitly.
    if (typeof global.getBestAnimeResult !== 'function' || typeof global.pickDisplayTitle !== 'function') {
      const funcRe = /function\s+(getBestAnimeResult|pickDisplayTitle)\s*\([^)]*\)\s*{[\s\S]*?\n\}/g;
      let fm;
      while ((fm = funcRe.exec(combinedScripts)) !== null) {
        const funcDef = fm[0];
        const name = fm[1];
        try {
          // create a function object from the declaration and assign to global
          const created = new Function('return ' + funcDef)();
          global[name] = created;
        } catch (e) {
          // ignore and continue
        }
      }
    }

    if (typeof global.getBestAnimeResult !== 'function' || typeof global.pickDisplayTitle !== 'function') {
      const gkeys = Object.keys(global).slice(0,50).join(',');
      throw new Error(`未能載入目標函式到 global。global keys (sample): ${gkeys}. inline scripts length: ${combinedScripts.length}`);
    }
  });

  test('matches Chinese/Japanese/English queries correctly', () => {
    const getBestAnimeResult = global.getBestAnimeResult;
    const pickDisplayTitle = global.pickDisplayTitle;

    const sampleResults = [
      {
        title: 'Your Name.',
        title_english: 'Your Name',
        title_japanese: '君の名は。',
        titles: [{ title: '你的名字', type: 'Alternative' }],
        images: { jpg: { image_url: '' } },
        year: 2016,
        episodes: 1,
        mal_id: 1,
      },
      {
        title: 'Detective Conan',
        title_english: 'Case Closed',
        title_japanese: '名探偵コナン',
        titles: [
          { title: '名偵探柯南', type: 'Alternative' },
          { title: '名侦探柯南', type: 'Alternative' }
        ],
        images: { jpg: { image_url: '' } },
        year: 1996,
        episodes: 1000,
        mal_id: 2,
      }
    ];

    const cases = [
      { q: '名偵探柯南', expectMal: 2 },
      { q: '名探偵コナン', expectMal: 2 },
      { q: 'Detective Conan', expectMal: 2 },
      { q: '你的名字', expectMal: 1 },
      { q: '君の名は', expectMal: 1 },
    ];

    cases.forEach((c) => {
      const best = getBestAnimeResult(sampleResults, c.q);
      expect(best).toBeDefined();
      expect(best.mal_id).toBe(c.expectMal);
      const title = pickDisplayTitle(best, c.q);
      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
    });
  });

  test('additional real-world variants', () => {
    const getBestAnimeResult = global.getBestAnimeResult;
    const pickDisplayTitle = global.pickDisplayTitle;

    const sampleResults = [
      {
        title: 'Attack on Titan',
        title_english: 'Attack on Titan',
        title_japanese: '進撃の巨人',
        titles: [
          { title: '進擊的巨人', type: 'Japanese' },
          { title: '进击的巨人', type: 'Alternative' }
        ],
        images: { jpg: { image_url: '' } },
        year: 2013,
        episodes: 75,
        mal_id: 3,
      },
      {
        title: 'One Piece',
        title_english: 'One Piece',
        title_japanese: 'ワンピース',
        titles: [
          { title: '海賊王', type: 'Alternative' },
          { title: '海贼王', type: 'Alternative' }
        ],
        images: { jpg: { image_url: '' } },
        year: 1999,
        episodes: 1000,
        mal_id: 4,
      }
    ];

    const cases = [
      { q: '進擊的巨人', expectMal: 3 },
      { q: '进击的巨人', expectMal: 3 },
      { q: 'One Piece', expectMal: 4 },
      { q: '海賊王', expectMal: 4 }
    ];

    cases.forEach((c) => {
      const best = getBestAnimeResult(sampleResults, c.q);
      expect(best).toBeDefined();
      expect(best.mal_id).toBe(c.expectMal);
      const title = pickDisplayTitle(best, c.q);
      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
    });
  });
});

