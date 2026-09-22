package config

import "os"

const PluginID = "resources-monitor"

func GetHostGRPCPort() string {
	return os.Getenv("GALACIUS_HOST_GRPC_PORT")
}
