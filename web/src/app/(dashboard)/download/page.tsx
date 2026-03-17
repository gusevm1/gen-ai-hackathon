import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FolderOpen, ToggleRight, Puzzle } from "lucide-react"
import { CopyExtensionsUrl } from "@/components/copy-extensions-url"

const steps = [
  {
    number: 1,
    icon: FolderOpen,
    title: "Unzip the downloaded file",
    description:
      "Extract the downloaded .zip file. You'll get a folder containing the extension files.",
  },
  {
    number: 2,
    icon: null,
    title: "Open Chrome Extensions",
    description: null,
  },
  {
    number: 3,
    icon: ToggleRight,
    title: "Enable Developer Mode",
    description:
      "In the top-right corner of the extensions page, toggle the 'Developer mode' switch to ON.",
  },
  {
    number: 4,
    icon: Puzzle,
    title: "Load the extension",
    description:
      "Click 'Load unpacked' in the top-left, then select the unzipped folder. The HomeMatch extension will appear in your extensions list.",
  },
]

export default function DownloadPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Download Extension</h1>
        <p className="text-muted-foreground">
          Install the HomeMatch Chrome extension to score listings on Flatfox
        </p>
      </div>

      <div className="flex flex-col items-center mb-10">
        <a href="/homematch-extension.zip" download="homematch-extension.zip">
          <Button size="lg">
            <Download className="size-4" />
            Download HomeMatch Extension
          </Button>
        </a>
        <span className="text-xs text-muted-foreground mt-2">v0.4.0</span>
      </div>

      <h2 className="text-xl font-semibold mb-4">Installation Instructions</h2>

      <div className="space-y-4">
        {steps.map((step) => (
          <Card key={step.number}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {step.number}
                </span>
                {step.icon && <step.icon className="size-5" />}
                {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step.number === 2 ? (
                <div className="text-muted-foreground">
                  <p className="mb-2">
                    Open a new tab and go to the extensions page:
                  </p>
                  <div className="mb-2">
                    <CopyExtensionsUrl />
                  </div>
                  <p className="text-sm">
                    Copy the URL above and paste it into your browser&apos;s
                    address bar.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">{step.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
