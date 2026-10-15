# syntax=docker/dockerfile:1.6
FROM golang:1.25-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o api ./cmd/api \
 && CGO_ENABLED=0 GOOS=linux go build -o ingest ./cmd/ingest \
 && CGO_ENABLED=0 GOOS=linux go build -o admin ./cmd/admin

FROM alpine:3.20
# poppler: PDF text; tesseract: OCR for scanned PDFs (Romanian, English, Russian).
RUN apk --no-cache add ca-certificates tzdata poppler-utils \
    tesseract-ocr tesseract-ocr-data-ron tesseract-ocr-data-eng tesseract-ocr-data-rus
WORKDIR /app
COPY --from=builder /app/api /app/ingest /app/admin ./
COPY --from=builder /app/prompts ./prompts
ENV DOCUMENTS_DIR=/documents
EXPOSE 8080
CMD ["./api"]
