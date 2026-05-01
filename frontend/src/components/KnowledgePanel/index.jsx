import { useState } from 'react';
import { Upload, Trash2, File, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

export default function KnowledgePanel({ files, onFilesChange }) {
  const [uploading, setUploading] = useState(false);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploaded = await api.uploadKnowledgeFile(file);
      onFilesChange([...files, uploaded]);
    } catch {
      // silently fail for now
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (filename) => {
    try {
      await api.deleteKnowledgeFile(filename);
      onFilesChange(files.filter((f) => f.filename !== filename));
    } catch {
      // silently fail for now
    }
  };

  return (
    <div className="border-t border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">知识库</h3>
        <label className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          上传
          <input
            type="file"
            className="hidden"
            accept=".md,.txt,.json"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {files.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">暂无文件，点击上传添加</p>
      ) : (
        <ul className="space-y-1">
          {files.map((f) => (
            <li
              key={f.filename}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 group"
            >
              <File size={12} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 truncate">{f.filename}</p>
                <p className="text-xs text-gray-400">{formatSize(f.size)}</p>
              </div>
              <button
                onClick={() => handleDelete(f.filename)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
