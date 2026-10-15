package logger

import (
	"os"
	"sync"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	Log  *zap.Logger
	once sync.Once
)

func Init(env string) {
	once.Do(func() {
		var config zap.Config
		if env == "production" {
			config = zap.NewProductionConfig()
			config.EncoderConfig.TimeKey = "timestamp"
			config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
		} else {
			config = zap.NewDevelopmentConfig()
			config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
			config.EncoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout(time.RFC3339)
		}

		config.OutputPaths = []string{"stdout"}
		if env == "production" {
			config.OutputPaths = append(config.OutputPaths, "logs/app.log")
			os.MkdirAll("logs", 0755)
		}

		var err error
		Log, err = config.Build(zap.AddCallerSkip(1))
		if err != nil {
			panic("failed to initialize logger: " + err.Error())
		}
	})
}

func Info(msg string, fields ...zap.Field) {
	Log.Info(msg, fields...)
}

func Debug(msg string, fields ...zap.Field) {
	Log.Debug(msg, fields...)
}

func Error(msg string, fields ...zap.Field) {
	Log.Error(msg, fields...)
}

func Warn(msg string, fields ...zap.Field) {
	Log.Warn(msg, fields...)
}

func Fatal(msg string, fields ...zap.Field) {
	Log.Fatal(msg, fields...)
}

func With(fields ...zap.Field) *zap.Logger {
	return Log.With(fields...)
}

func Sync() {
	Log.Sync()
}
