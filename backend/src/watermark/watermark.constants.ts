// Tách riêng khỏi watermark.module.ts — processor.ts từng import ngược lại
// module.ts để lấy hằng số này, tạo circular import khiến @Processor(...)
// nhận giá trị undefined lúc decorator chạy (BullMQ báo "Queue name must be
// provided") vì module graph ESM/CJS chưa resolve xong vòng lặp.
export const WATERMARK_QUEUE = 'watermark';
