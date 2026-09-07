// Local QA: Apple's independent barcode decoder verifies the generated PNG.
import Foundation
import Vision
import ImageIO
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let request = VNDetectBarcodesRequest()
request.symbologies = [.qr]
try VNImageRequestHandler(url: url).perform([request])
guard let payload = request.results?.first?.payloadStringValue else {
    fatalError("QR code did not decode")
}
print(payload)
