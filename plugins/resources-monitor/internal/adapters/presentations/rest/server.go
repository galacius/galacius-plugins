package rest

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/port"
)

type HttpServer struct {
	httpSrv *http.Server
	ln      net.Listener
	version string
	Port    int
}

func NewHttpServer(listen, version string, svc port.MonitorService) (*HttpServer, error) {
	ln, err := net.Listen("tcp", listen)
	if err != nil {
		return nil, fmt.Errorf("listen for HTTP: %w", err)
	}

	host, portStr, err := net.SplitHostPort(ln.Addr().String())
	if err != nil {
		ln.Close()
		return nil, fmt.Errorf("parse http listener address: %w", err)
	}

	if host != "127.0.0.1" && host != "::1" && host != "localhost" {
		ln.Close()
		return nil, fmt.Errorf("CORS hardening: listener must be localhost-only; got %q", host)
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		ln.Close()
		return nil, fmt.Errorf("convert http port to int: %w", err)
	}

	router := chi.NewRouter()
	router.Use(corsMiddleware)

	h := NewHandler(svc)
	router.Post("/api/resources-monitor/getSnapshot", h.getSnapshot)
	router.Post("/api/resources-monitor/getSettings", h.getSettings)
	router.Post("/api/resources-monitor/saveSettings", h.saveSettings)
	router.Post("/api/resources-monitor/getCapabilities", h.getCapabilities)
	router.Post("/api/resources-monitor/listDisks", h.listDisks)
	router.Post("/api/resources-monitor/listInterfaces", h.listInterfaces)
	router.Post("/api/resources-monitor/resetSettings", h.resetSettings)

	return &HttpServer{
		httpSrv: &http.Server{Handler: router},
		ln:      ln,
		version: version,
		Port:    port,
	}, nil
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if origin := r.Header.Get("Origin"); origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *HttpServer) Serve() error {
	handshake := map[string]any{
		"type":      "READY",
		"version":   s.version,
		"httpPort":  s.Port,
		"pid":       os.Getpid(),
		"timestamp": time.Now().Format(time.RFC3339),
	}
	data, _ := json.Marshal(handshake)
	fmt.Println(string(data))
	os.Stdout.Sync()

	return s.httpSrv.Serve(s.ln)
}

func (s *HttpServer) Close() error {
	return s.httpSrv.Close()
}
