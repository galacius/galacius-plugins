package rest

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/dto"
	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/port"
)

type Handler struct {
	svc port.MonitorService
}

func NewHandler(svc port.MonitorService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) getSnapshot(w http.ResponseWriter, r *http.Request) {
	sample, err := h.svc.GetSnapshot(r.Context())
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: get snapshot: %v\n", err)
		writeError(w, http.StatusServiceUnavailable, "PLUGIN_UNAVAILABLE", "failed to get snapshot")
		return
	}
	writeJSON(w, sample)
}

func (h *Handler) getSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.svc.GetSettings(r.Context())
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: get settings: %v\n", err)
		writeError(w, http.StatusServiceUnavailable, "PLUGIN_UNAVAILABLE", "failed to get settings")
		return
	}
	writeJSON(w, settings)
}

func (h *Handler) saveSettings(w http.ResponseWriter, r *http.Request) {
	var req dto.Settings
	if ok, err := decodeBody(r, &req); !ok {
		fmt.Fprintf(os.Stderr, "error: decode save settings request: %v\n", err)
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if err := h.svc.SaveSettings(r.Context(), req); err != nil {
		fmt.Fprintf(os.Stderr, "error: save settings: %v\n", err)
		writeError(w, http.StatusServiceUnavailable, "PLUGIN_UNAVAILABLE", "failed to save settings")
		return
	}

	writeJSON(w, req)
}

func (h *Handler) getCapabilities(w http.ResponseWriter, r *http.Request) {
	caps := h.svc.GetCapabilities(r.Context())
	writeJSON(w, caps)
}

func (h *Handler) resetSettings(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.ResetSettings(r.Context()); err != nil {
		fmt.Fprintf(os.Stderr, "error: reset settings: %v\n", err)
		writeError(w, http.StatusServiceUnavailable, "PLUGIN_UNAVAILABLE", "failed to reset settings")
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}

func decodeBody(r *http.Request, v interface{}) (bool, error) {
	data, err := io.ReadAll(r.Body)
	if err != nil {
		return false, err
	}
	if err := json.Unmarshal(data, v); err != nil {
		return false, err
	}
	return true, nil
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{
		"code":    code,
		"message": message,
	})
}
