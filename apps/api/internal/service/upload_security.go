package service

import (
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
)

// maxAvatarBytes is the largest accepted profile picture.
const maxAvatarBytes = 5 << 20

// ValidateAvatar checks the actual bytes of an uploaded profile picture.
func ValidateAvatar(file *multipart.FileHeader) error {
	if file.Size <= 0 || file.Size > maxAvatarBytes {
		return errors.New("Imagine goală sau prea mare (maximum 5 MB).")
	}
	f, err := file.Open()
	if err != nil {
		return errors.New("Fișierul nu poate fi citit.")
	}
	defer f.Close()
	head := make([]byte, 512)
	n, _ := io.ReadFull(f, head)
	mime := http.DetectContentType(head[:n])
	ext := strings.ToLower(filepath.Ext(file.Filename))
	ok := (ext == ".png" && mime == "image/png") ||
		((ext == ".jpg" || ext == ".jpeg") && mime == "image/jpeg") ||
		(ext == ".webp" && mime == "image/webp")
	if !ok {
		return errors.New("Format neacceptat. Folosește PNG, JPEG sau WebP.")
	}
	return nil
}
