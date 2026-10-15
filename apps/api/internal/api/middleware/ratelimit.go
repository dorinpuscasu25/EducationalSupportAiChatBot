package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// Simple in-memory fixed-window rate limiter, keyed by client IP + route.
// Sufficient for a single backend instance; swap for Redis if scaling out.

type rlEntry struct {
	count   int
	resetAt time.Time
}

var (
	rlMu    sync.Mutex
	rlStore = map[string]*rlEntry{}
)

func init() {
	// Periodically drop expired entries to bound memory.
	go func() {
		t := time.NewTicker(5 * time.Minute)
		for range t.C {
			now := time.Now()
			rlMu.Lock()
			for k, e := range rlStore {
				if now.After(e.resetAt) {
					delete(rlStore, k)
				}
			}
			rlMu.Unlock()
		}
	}()
}

// RateLimit allows `max` requests per `window` per client IP for the route it is
// attached to. On exceed it responds 429 with Retry-After.
func RateLimit(max int, window time.Duration) gin.HandlerFunc {
	return rateLimit(max, window, func(c *gin.Context) string {
		return c.ClientIP()
	})
}

// RateLimitUser limits per authenticated user rather than per IP.
//
// For the chat routes the IP is the wrong key in both directions: a firm behind
// one NAT would share a single bucket, while one account moving between
// networks would escape the limit entirely. The quota caps tokens per month;
// nothing capped the rate, so a single account could spend its whole allowance
// in a burst and load the stack while doing it. Falls back to the IP when no
// user is attached, so the route is never left unlimited.
func RateLimitUser(max int, window time.Duration) gin.HandlerFunc {
	return rateLimit(max, window, func(c *gin.Context) string {
		if userID := c.GetString("userID"); userID != "" {
			return "user:" + userID
		}
		return "ip:" + c.ClientIP()
	})
}

func rateLimit(
	max int,
	window time.Duration,
	subject func(*gin.Context) string,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := subject(c) + "|" + c.FullPath()
		now := time.Now()

		rlMu.Lock()
		e, ok := rlStore[key]
		if !ok || now.After(e.resetAt) {
			e = &rlEntry{count: 0, resetAt: now.Add(window)}
			rlStore[key] = e
		}
		e.count++
		count, resetAt := e.count, e.resetAt
		rlMu.Unlock()

		if count > max {
			retry := int(time.Until(resetAt).Seconds())
			if retry < 1 {
				retry = 1
			}
			c.Header("Retry-After", time.Duration(retry*int(time.Second)).String())
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "too_many_requests",
				"retry_after": retry,
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
