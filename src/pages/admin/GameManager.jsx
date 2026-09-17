import React, { useState } from 'react';
import { useNotification } from '../../components/common/NotificationSystem';

export const GameManager = () => {
  const { showToast } = useNotification();
  
  // Static state with user's requested data
  const [games, setGames] = useState([
    {
      id: 1,
      title: 'Game',
      url: 'https://xuanchau99.github.io/game-english',
      image_url: 'https://xuanchau99.github.io/game-english/img/Arrange%20the%20Sentence.png'
    }
  ]);

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    showToast('Đã copy link game!', 'success');
  };

  return (
    <div id="tab-games-content" className="animate-in fade-in duration-300">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.3rem' }}>
          <i className="fa-solid fa-gamepad" style={{ color: 'var(--primary)' }}></i> Game Manager
        </h3>
        <button className="btn-primary" onClick={() => showToast('Tính năng thêm game đang phát triển', 'info')} style={{ padding: '0.6rem 1.25rem', borderRadius: '2rem' }}>
          + New Game
        </button>
      </div>

      <div className="game-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {games.map(game => (
          <div key={game.id} className="game-card" style={{ background: 'white', border: '2px solid var(--border-color)', borderRadius: 'var(--radius)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'var(--transition)', boxShadow: 'var(--shadow-sm)' }}>
            
            <div className="game-image-container" style={{ width: '100%', height: '160px', backgroundColor: '#f0f0f0', overflow: 'hidden', position: 'relative' }}>
              <img 
                src={game.image_url} 
                alt={game.title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                onError={(e) => { e.target.src = 'https://via.placeholder.com/280x160?text=No+Image'; }}
              />
            </div>
            
            <div className="game-info" style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--primary)', fontSize: '1.1rem', fontWeight: 800 }}>{game.title}</h4>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', padding: '0.5rem', backgroundColor: 'var(--bg-item)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <i className="fa-solid fa-link" style={{ color: 'var(--text-muted)' }}></i>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {game.url}
                </span>
              </div>
              
              <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between' }}>
                <button 
                  onClick={() => handleCopyLink(game.url)} 
                  style={{ flex: '1 1 calc(50% - 0.25rem)', padding: '0.5rem', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                >
                  <i className="fa-regular fa-copy"></i> Copy URL
                </button>
                <button 
                  onClick={() => window.open(game.url, '_blank')}
                  style={{ flex: '1 1 calc(50% - 0.25rem)', padding: '0.5rem', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                >
                  <i className="fa-solid fa-play"></i> Open
                </button>
                <button 
                  style={{ flex: '1 1 calc(50% - 0.25rem)', padding: '0.5rem', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                >
                  <i className="fa-solid fa-pen"></i> Edit
                </button>
                <button 
                  style={{ flex: '1 1 calc(50% - 0.25rem)', padding: '0.5rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                >
                  <i className="fa-solid fa-trash"></i> Delete
                </button>
              </div>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
};
