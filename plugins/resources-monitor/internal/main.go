package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"

	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/adapters/infrastructures/collector"
	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/adapters/infrastructures/store"
	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/adapters/presentations/rest"
	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/monitor"
	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/config"
	coreasync "github.com/galacius/galacius/packages/core/async"
	"github.com/galacius/galacius/packages/core/util"
)

var (
	Version = "dev"
	authToken string
)

func main() {
	listen := flag.String("listen", "127.0.0.1:0", "HTTP listen address (port 0 = auto-assign)")
	flag.Parse()

	token, err := util.ReadAuthTokenFromStdin()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: read auth token from stdin: %v\n", err)
		os.Exit(1)
	}
	authToken = token

	hostPort := config.GetHostGRPCPort()
	var hostClient *coreasync.GrpcClient
	if hostPort != "" {
		addr := fmt.Sprintf("127.0.0.1:%s", hostPort)
		client := &coreasync.GrpcClient{}
		if err := client.Dial(addr, authToken); err != nil {
			fmt.Fprintf(os.Stderr, "warning: failed to connect to host gRPC server: %v\n", err)
		} else {
			defer client.Close()
			hostClient = client
		}
	}

	batteryCollector := collector.NewBatteryCollector()
	metricsCollector := collector.NewGopsutilCollector(batteryCollector)

	settingsStore, err := store.NewFileSettingsStore()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: create settings store: %v\n", err)
		os.Exit(1)
	}

	eventEmitFn := func(ctx context.Context, eventName string, pluginID string, data any) {
		if hostClient != nil {
			hostClient.Emit(ctx, eventName, config.PluginID, data)
		}
	}

	monitorService, err := monitor.NewService(metricsCollector, settingsStore, &emitWrapper{emit: eventEmitFn}, config.PluginID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: create monitor service: %v\n", err)
		os.Exit(1)
	}
	defer monitorService.Stop()

	httpServer, err := rest.NewHttpServer(*listen, Version, monitorService)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
	defer httpServer.Close()

	if err := httpServer.Serve(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		fmt.Fprintf(os.Stderr, "error: http serve: %v\n", err)
		os.Exit(1)
	}
}

type emitWrapper struct {
	emit func(ctx context.Context, eventName string, pluginID string, data any)
}

func (e *emitWrapper) Emit(ctx context.Context, eventName string, pluginID string, data interface{}) {
	e.emit(ctx, eventName, pluginID, data)
}
