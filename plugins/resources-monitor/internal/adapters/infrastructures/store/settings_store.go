package store

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"

	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/dto"
	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/port"
	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/config"
)

type FileSettingsStore struct {
	filePath string
}

// hostStorageDir mirrors the host app's internal/storage.Dir() base-directory
// resolution (GALACIUS_ROOT_DIR override, else $HOME/.galacius), since that
// helper is host-internal and not exposed via packages/core for plugins to import.
func hostStorageDir(elem ...string) (string, error) {
	base := os.Getenv("GALACIUS_ROOT_DIR")
	if base == "" {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			homeDir = os.ExpandEnv("$HOME")
		}
		base = filepath.Join(homeDir, ".galacius")
	}
	return filepath.Join(append([]string{base}, elem...)...), nil
}

func NewFileSettingsStore() (port.SettingsStore, error) {
	pluginDataDir, err := hostStorageDir("plugins", config.PluginID)
	if err != nil {
		return nil, fmt.Errorf("resolve plugin data directory: %w", err)
	}
	if err := os.MkdirAll(pluginDataDir, 0700); err != nil {
		return nil, fmt.Errorf("create plugin data directory: %w", err)
	}

	filePath := filepath.Join(pluginDataDir, "settings.json")
	return &FileSettingsStore{filePath: filePath}, nil
}

func (s *FileSettingsStore) Load(ctx context.Context) (dto.Settings, error) {
	data, err := ioutil.ReadFile(s.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return dto.DefaultSettings(), nil
		}
		fmt.Fprintf(os.Stderr, "error reading settings file: %v, using defaults\n", err)
		return dto.DefaultSettings(), nil
	}

	var settings dto.Settings
	if err := json.Unmarshal(data, &settings); err != nil {
		fmt.Fprintf(os.Stderr, "error unmarshaling settings file: %v, using defaults\n", err)
		return dto.DefaultSettings(), nil
	}

	if settings.SchemaVersion == 0 {
		return dto.DefaultSettings(), nil
	}

	return settings, nil
}

func (s *FileSettingsStore) Save(ctx context.Context, settings dto.Settings) error {
	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal settings: %w", err)
	}

	dir := filepath.Dir(s.filePath)
	tmpFile, err := ioutil.TempFile(dir, "settings-*.json")
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	tmpPath := tmpFile.Name()

	if _, err := tmpFile.Write(data); err != nil {
		tmpFile.Close()
		os.Remove(tmpPath)
		return fmt.Errorf("write to temp file: %w", err)
	}

	if err := tmpFile.Close(); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("close temp file: %w", err)
	}

	if err := os.Chmod(tmpPath, 0600); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("chmod temp file: %w", err)
	}

	if err := os.Rename(tmpPath, s.filePath); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("rename temp file: %w", err)
	}

	return nil
}
