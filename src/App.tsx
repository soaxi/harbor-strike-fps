'use client';
import { useEffect, useRef, useState } from 'react';
import { startGame, type HUD } from './play';
import { Slider } from '@/components/ui/slider';
import { DEFAULT_ROSTER } from './roster';
import { WEAPONS } from './weapons';
export default function Home() {
  const [roster, setRoster] = useState(DEFAULT_ROSTER);
  const host = useRef<HTMLDivElement>(null),
    api = useRef<ReturnType<typeof startGame> | null>(null);
  const [h, setH] = useState<HUD>({
    hp: 100,
    ammo: 30,
    reserve: 120,
    time: 120,
    blue: 5,
    red: 5,
    score: [0, 0],
    round: 1,
    kills: 0,
    mode: 'menu',
    message: '',
    feed: [],
    reload: false,
    weapon: 0,
    aiming: false,
    audioStatus: '音效載入中',
    fps: 60,
  });
  useEffect(() => {
    if (host.current) api.current = startGame(host.current, setH);
    return () => api.current?.dispose();
  }, []);
  return (
    <main>
      <div ref={host} className="world" />
      <div className="shade" />
      <header>
        <div className="brand">
          H<span>╱</span>S <small>HARBOR STRIKE</small>
        </div>
        <div className="top-tag">
          港區 07 · {roster.allies + 1} V {roster.enemies} · 殲滅戰
        </div>
      </header>
      <div className="match">
        <div className="blue">
          {h.score[0]}
          <small>
            先鋒小隊 · {h.mode === 'menu' ? roster.allies + 1 : h.blue} 存活
          </small>
        </div>
        <div className="clock">
          <small>回合 {h.round} · 先取 5 勝</small>
          <b>
            {Math.floor(h.time / 60)}:
            {String(Math.floor(h.time % 60)).padStart(2, '0')}
          </b>
        </div>
        <div className="red">
          {h.score[1]}
          <small>
            敵方小隊 · {h.mode === 'menu' ? roster.enemies : h.red} 存活
          </small>
        </div>
      </div>
      <div className="performance">
        {h.fps} FPS · {h.audioStatus}
      </div>
      <div className="feed">
        {h.feed.map((f, i) => (
          <p key={i}>{f}</p>
        ))}
      </div>
      {h.mode === 'playing' && (
        <>
          {h.aiming && h.weapon === 1 ? (
            <div className="scope">
              <div />
              <span>SR-08 · 4×</span>
            </div>
          ) : (
            <div className="crosshair">{h.weapon === 2 ? '⊕' : '+'}</div>
          )}
          <div className="weapon-strip">
            {WEAPONS.map((w, i) => (
              <span key={w.short} className={h.weapon === i ? 'selected' : ''}>
                <b>{i + 1}</b>
                {w.short}
              </span>
            ))}
          </div>
          <div className="center-note">
            {h.reload
              ? '裝填中…'
              : h.hp <= 0
                ? '你已陣亡 · 觀戰隊友'
                : h.weapon === 3
                  ? '左鍵投擲 · 2.2 秒引信 · 小心自身爆炸傷害'
                  : ''}
          </div>
        </>
      )}
      <footer>
        <div className="health">
          <small>生命值</small>
          <strong>＋ {h.hp}</strong>
          <div className="bar">
            <i style={{ width: h.hp + '%' }} />
          </div>
        </div>
        <div className="keys">
          WASD 移動 · 左鍵 射擊／投擲 · 右鍵 瞄準 · R 換彈 · 1–4 切換武器
        </div>
        <div className="ammo">
          <small>{WEAPONS[h.weapon].name}</small>
          <strong>
            {h.ammo}
            <em>{h.weapon === 3 ? ' 顆' : ` / ${h.reserve}`}</em>
          </strong>
        </div>
      </footer>
      {h.mode !== 'playing' && (
        <div className="overlay">
          <section className="menu">
            <div className="eyebrow">TACTICAL OPERATIONS / 001</div>
            <h1>
              {h.mode === 'menu' ? (
                <>
                  HARBOR
                  <br />
                  <span>STRIKE</span>
                </>
              ) : h.mode === 'paused' ? (
                '任務暫停'
              ) : (
                h.message
              )}
            </h1>
            <p>
              {h.mode === 'menu'
                ? '港區交戰'
                : h.mode === 'paused'
                  ? '準備就緒，回到戰場。'
                  : `本場擊殺 ${h.kills} · 藍隊 ${h.score[0]} : ${h.score[1]} 紅隊`}
            </p>
            <div className="brief">
              你與 {roster.allies} 名 AI 隊友，對抗 {roster.enemies} 名 AI
              敵人。
              <br />
              清除敵方全員取得回合勝利，先拿下 5 回合獲勝。
              <br />
              每回合 2 分鐘，逾時比較存活人數及剩餘生命。
            </div>
            {(h.mode === 'menu' || h.mode === 'match') && (
              <div className="roster-settings">
                <div className="roster-heading">
                  對戰人數{' '}
                  <span>
                    {roster.allies + 1} 對 {roster.enemies} · 共{' '}
                    {roster.allies + roster.enemies + 1} 人
                  </span>
                </div>
                <div className="roster-grid">
                  <div>
                    <label id="allies-label">
                      AI 隊友 <b>{roster.allies} 名</b>
                    </label>
                    <Slider
                      aria-labelledby="allies-label"
                      min={0}
                      max={49}
                      step={1}
                      value={[roster.allies]}
                      onValueChange={(value) =>
                        setRoster((v) => ({
                          ...v,
                          allies: Array.isArray(value) ? value[0] : value,
                        }))
                      }
                    />
                    <small>0–49 名，不包含你</small>
                  </div>
                  <div>
                    <label id="enemies-label">
                      AI 敵人 <b>{roster.enemies} 名</b>
                    </label>
                    <Slider
                      aria-labelledby="enemies-label"
                      min={1}
                      max={50}
                      step={1}
                      value={[roster.enemies]}
                      onValueChange={(value) =>
                        setRoster((v) => ({
                          ...v,
                          enemies: Array.isArray(value) ? value[0] : value,
                        }))
                      }
                    />
                    <small>1–50 名</small>
                  </div>
                </div>
                <p className="capacity-note">
                  最多 50 對 50（含你）；人數越多，效能需求越高。
                </p>
              </div>
            )}
            <button onClick={() => api.current?.begin(roster)}>
              {h.mode === 'menu'
                ? '開始行動'
                : h.mode === 'paused'
                  ? '繼續戰鬥'
                  : h.mode === 'match'
                    ? '再戰一場'
                    : '下一回合'}{' '}
              <span>↗</span>
            </button>
            <div className="menu-bottom">
              單人 + 電腦 AI <span>使用電腦鍵盤與滑鼠</span>
            </div>
            <div className="error">{h.mode === 'paused' && h.message}</div>
          </section>
          <aside className="map-card">
            <span>戰術區域</span>
            <h2>07 / 貨運港區</h2>
            <p>中央貨櫃場 · 雙側迂迴通道</p>
            <div className="legend">● 藍色隊友　● 橘色敵人</div>
            <div className="arsenal-help">
              1 步槍 · 2 狙擊槍 · 3 散彈槍 · 4 手榴彈
            </div>
            <a href={import.meta.env.BASE_URL + "audio/credits.txt"} target="_blank" rel="noreferrer">
              音效素材來源 ↗
            </a>
          </aside>
        </div>
      )}
    </main>
  );
}

