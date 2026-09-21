// +build windows

package collector

import (
	"context"
	"fmt"

	"github.com/distatus/battery"

	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/dto"
)

type WindowsBatteryCollector struct{}

func NewBatteryCollector() BatteryCollector {
	return &WindowsBatteryCollector{}
}

func (c *WindowsBatteryCollector) CollectBattery(ctx context.Context) (*dto.BatteryMetric, error) {
	batteries, err := battery.GetAll()
	if err != nil {
		return nil, fmt.Errorf("get batteries: %w", err)
	}

	if len(batteries) == 0 {
		return nil, fmt.Errorf("no batteries found")
	}

	bat := batteries[0]
	state := bat.State.String()
	plugged := bat.State.String() == "charging"

	percent := 0.0
	if bat.Full > 0 {
		percent = float64(bat.Current) / float64(bat.Full) * 100
		if percent > 100 {
			percent = 100
		}
	}

	return &dto.BatteryMetric{
		Percent:        percent,
		State:          state,
		Plugged:        plugged,
		TimeRemaining:  0,
	}, nil
}
