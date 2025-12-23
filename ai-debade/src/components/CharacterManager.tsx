import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { AICharacter } from '../types';
import './CharacterManager.css';

export const CharacterManager = () => {
  const {
    showCharacterManager,
    setShowCharacterManager,
    characters,
    addCharacter,
    removeCharacter,
  } = useStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    avatar: '😊',
    personality: '',
    style: '',
  });

  const handleAddCharacter = () => {
    if (!newCharacter.name || !newCharacter.personality) {
      alert('请填写角色名称和人设~');
      return;
    }

    const character: AICharacter = {
      id: `custom-${Date.now()}`,
      name: newCharacter.name,
      avatar: newCharacter.avatar,
      personality: newCharacter.personality,
      style: newCharacter.style.split(',').map(s => s.trim()).filter(Boolean),
      isCustom: true,
    };

    addCharacter(character);
    setNewCharacter({ name: '', avatar: '😊', personality: '', style: '' });
    setShowAddForm(false);
  };

  const handleDeleteCharacter = (id: string) => {
    const character = characters.find(c => c.id === id);
    if (character && !character.isCustom) {
      alert('预设角色不能删除哦~');
      return;
    }
    if (confirm('确定要删除这个角色吗？')) {
      removeCharacter(id);
    }
  };

  if (!showCharacterManager) return null;

  return (
    <div className="character-overlay" onClick={() => setShowCharacterManager(false)}>
      <div className="character-modal" onClick={(e) => e.stopPropagation()}>
        <div className="character-header">
          <h2>🎭 管理AI角色</h2>
          <button className="close-btn" onClick={() => setShowCharacterManager(false)}>
            ✕
          </button>
        </div>

        <div className="character-content">
          <div className="character-list">
            {characters.map((char) => (
              <div key={char.id} className="character-item">
                <div className="character-info">
                  <span className="char-avatar">{char.avatar}</span>
                  <div className="char-details">
                    <div className="char-name">
                      {char.name}
                      {char.isCustom && <span className="custom-badge">自定义</span>}
                    </div>
                    <div className="char-personality">{char.personality}</div>
                  </div>
                </div>
                {char.isCustom && (
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteCharacter(char.id)}
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>

          {!showAddForm && (
            <button className="add-character-btn" onClick={() => setShowAddForm(true)}>
              ➕ 添加自定义角色
            </button>
          )}

          {showAddForm && (
            <div className="add-form">
              <h3>创建新角色</h3>

              <div className="form-group">
                <label>名称</label>
                <input
                  type="text"
                  placeholder="例如：爱讲涩话的Tim"
                  value={newCharacter.name}
                  onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>头像 Emoji</label>
                <input
                  type="text"
                  placeholder="😊"
                  value={newCharacter.avatar}
                  onChange={(e) => setNewCharacter({ ...newCharacter, avatar: e.target.value })}
                  maxLength={2}
                />
              </div>

              <div className="form-group">
                <label>人设描述</label>
                <textarea
                  placeholder="例如：乐观的产品经理，喜欢用比喻，说话带儿化音"
                  rows={3}
                  value={newCharacter.personality}
                  onChange={(e) => setNewCharacter({ ...newCharacter, personality: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>评论风格（逗号分隔）</label>
                <input
                  type="text"
                  placeholder="例如：多夸奖, 提供具体例子, 使用网络用语"
                  value={newCharacter.style}
                  onChange={(e) => setNewCharacter({ ...newCharacter, style: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button className="cancel-btn" onClick={() => setShowAddForm(false)}>
                  取消
                </button>
                <button className="submit-btn" onClick={handleAddCharacter}>
                  创建角色
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
