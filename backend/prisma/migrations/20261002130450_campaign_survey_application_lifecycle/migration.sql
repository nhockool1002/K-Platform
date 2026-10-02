-- AlterEnum
-- Mở rộng vòng đời Submission để bao trùm cả bước ứng tuyển Survey (Phase 3,
-- FN-CAMP-02) lẫn nộp Proof (Phase 4, FN-TASK-01/02) trên cùng 1 bản ghi —
-- khớp README.md § 9.5 (applicationId ban đầu == submissionId về sau).
-- Tách riêng migration này (chỉ ADD VALUE) khỏi phần dùng giá trị mới bên dưới:
-- Postgres không cho dùng giá trị enum mới thêm trong cùng 1 transaction đã
-- thêm nó (lỗi 55P04 "unsafe use of new value").
ALTER TYPE "SubmissionStatus" ADD VALUE 'APPLIED';
ALTER TYPE "SubmissionStatus" ADD VALUE 'INVITED';
ALTER TYPE "SubmissionStatus" ADD VALUE 'REJECTED_APPLICATION';
