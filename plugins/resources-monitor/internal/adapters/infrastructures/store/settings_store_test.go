package store

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"os"
	"path/filepath"
	"testing"

	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/dto"
)

func TestSettingsStoreLoadDefaults(t *testing.T) {
	tmpDir, err := ioutil.TempDir("", "test-settings")
	if err != nil {
		t.Fatalf("create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	store := &FileSettingsStore{filePath: filepath.Join(tmpDir, "settings.json")}

	settings, err := store.Load(context.Background())
	if err != nil {
		t.Fatalf("load: %v", err)
	}

	if settings.IntervalMs != 2000 {
		t.Errorf("expected default interval 2000, got %d", settings.IntervalMs)
	}
}

func TestSettingsStoreSaveAndLoad(t *testing.T) {
	tmpDir, err := ioutil.TempDir("", "test-settings")
	if err != nil {
		t.Fatalf("create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	filePath := filepath.Join(tmpDir, "settings.json")
	store := &FileSettingsStore{filePath: filePath}

	originalSettings := dto.Settings{
		SchemaVersion: 1,
		IntervalMs:    5000,
		EnabledMetrics: map[string]bool{
			"cpu": true,
		},
	}

	if err := store.Save(context.Background(), originalSettings); err != nil {
		t.Fatalf("save: %v", err)
	}

	loaded, err := store.Load(context.Background())
	if err != nil {
		t.Fatalf("load: %v", err)
	}

	if loaded.IntervalMs != 5000 {
		t.Errorf("expected interval 5000, got %d", loaded.IntervalMs)
	}
}

func TestSettingsStoreCorruptFileRecovery(t *testing.T) {
	tmpDir, err := ioutil.TempDir("", "test-settings")
	if err != nil {
		t.Fatalf("create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	filePath := filepath.Join(tmpDir, "settings.json")
	if err := ioutil.WriteFile(filePath, []byte("invalid json"), 0600); err != nil {
		t.Fatalf("write corrupt file: %v", err)
	}

	store := &FileSettingsStore{filePath: filePath}
	settings, err := store.Load(context.Background())
	if err != nil {
		t.Fatalf("load: %v", err)
	}

	if settings.IntervalMs != 2000 {
		t.Errorf("expected default interval 2000 on corrupt file, got %d", settings.IntervalMs)
	}
}

func TestSettingsStoreAtomicWrite(t *testing.T) {
	tmpDir, err := ioutil.TempDir("", "test-settings")
	if err != nil {
		t.Fatalf("create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	filePath := filepath.Join(tmpDir, "settings.json")
	store := &FileSettingsStore{filePath: filePath}

	settings := dto.Settings{
		SchemaVersion: 1,
		IntervalMs:    3000,
	}

	if err := store.Save(context.Background(), settings); err != nil {
		t.Fatalf("save: %v", err)
	}

	fileInfo, err := os.Stat(filePath)
	if err != nil {
		t.Fatalf("stat file: %v", err)
	}

	if (fileInfo.Mode() & os.FileMode(0077)) != 0 {
		t.Errorf("expected file permissions 0600, got %o", fileInfo.Mode())
	}

	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		t.Fatalf("read file: %v", err)
	}

	var loaded dto.Settings
	if err := json.Unmarshal(data, &loaded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if loaded.IntervalMs != 3000 {
		t.Errorf("expected interval 3000, got %d", loaded.IntervalMs)
	}
}
