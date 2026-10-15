package router

import (
	"net/http/httptest"
	"testing"
)

func TestProtectedRoutesRequireAuthentication(t *testing.T) {
	r := SetupRouter(nil, nil, Handlers{})
	for _, path := range []string{"/api/chats", "/api/admin/users", "/api/admin/knowledge", "/api/users/me"} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		if w.Code != 401 {
			t.Fatalf("%s: %d", path, w.Code)
		}
	}
}

func TestDocumentsFolderIsNotServed(t *testing.T) {
	r := SetupRouter(nil, nil, Handlers{})
	for _, path := range []string{"/documents/curs.pdf", "/uploads/curs.pdf"} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		if w.Code != 404 {
			t.Fatalf("%s: %d", path, w.Code)
		}
	}
}
