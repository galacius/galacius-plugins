// +build darwin

package collector

import (
	"context"
	"fmt"
	"os/exec"
	"strconv"
	"strings"

	"github.com/distatus/battery"

	"github.com/galacius/galacius-plugins/plugins/resources-monitor/internal/applications/dto"
)

type DarwinBatteryCollector struct{}

func NewBatteryCollector() BatteryCollector {
	return &DarwinBatteryCollector{}
}

func (c *DarwinBatteryCollector) CollectBattery(ctx context.Context) (*dto.BatteryMetric, error) {
	batteries, err := battery.GetAll()
	if err != nil {
		return c.collectBatteryViapmset(ctx)
	}

	if len(batteries) == 0 {
		return c.collectBatteryViapmset(ctx)
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

func (c *DarwinBatteryCollector) collectBatteryViapmset(ctx context.Context) (*dto.BatteryMetric, error) {
	cmd := exec.CommandContext(ctx, "pmset", "-g", "batt")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("run pmset: %w", err)
	}

	lines := strings.Split(string(output), "\n")
	if len(lines) < 2 {
		return nil, fmt.Errorf("unexpected pmset output format")
	}

	batteryLine := lines[1]
	parts := strings.Fields(batteryLine)
	if len(parts) < 3 {
		return nil, fmt.Errorf("unexpected pmset battery line format")
	}

	percentStr := strings.TrimSuffix(parts[2], "%")
	percent, err := strconv.ParseFloat(percentStr, 64)
	if err != nil {
		return nil, fmt.Errorf("parse battery percent: %w", err)
	}

	state := strings.TrimSuffix(strings.TrimPrefix(parts[3], "("), ")")
	plugged := strings.Contains(state, "charging")

	return &dto.BatteryMetric{
		Percent:   percent,
		State:     state,
		Plugged:   plugged,
		TimeRemaining: 0,
	}, nil
}
