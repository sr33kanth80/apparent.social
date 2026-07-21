param(
  [Parameter(Mandatory = $true)][string]$FramesDir,
  [Parameter(Mandatory = $true)][string]$AssetDir,
  [Parameter(Mandatory = $true)][string]$MusicPath
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force $FramesDir | Out-Null
New-Item -ItemType Directory -Force (Split-Path $MusicPath -Parent) | Out-Null

Add-Type -AssemblyName System.Drawing

$rendererSource = @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;

public static class OpenClawPromoRenderer
{
    const int Width = 1080;
    const int Height = 1920;
    const int Fps = 30;
    const int Duration = 20;
    const int TotalFrames = Fps * Duration;

    static readonly string[][] Scenes = new string[][] {
        new string[] {"1.8", "5.0", "Your startup already has proof.", "Repos. Launches. Early users.", "0", "sort"},
        new string[] {"5.0", "8.1", "Make it investor-readable.", "npx apparent turns work into a proof card.", "1", "stamp"},
        new string[] {"8.1", "11.5", "Find the investors who fit.", "Stage, sector, city, thesis.", "2", "map"},
        new string[] {"11.5", "14.8", "Match proof to thesis.", "The right investor sees why now.", "3", "weigh"},
        new string[] {"14.8", "18.0", "Turn cold into warm.", "Proof makes the first conversation easier.", "4", "bridge"}
    };

    public static void Render(string framesDir, string assetDir, string musicPath)
    {
        Image[] assets = new Image[] {
            Image.FromFile(Path.Combine(assetDir, "01-scattered-proof.png")),
            Image.FromFile(Path.Combine(assetDir, "02-verified-proof.png")),
            Image.FromFile(Path.Combine(assetDir, "03-heat-map-route.png")),
            Image.FromFile(Path.Combine(assetDir, "04-thesis-match.png")),
            Image.FromFile(Path.Combine(assetDir, "05-warm-investor-conversation.png"))
        };

        WriteMusicWav(musicPath, Duration);

        for (int frame = 0; frame < TotalFrames; frame++)
        {
            string file = Path.Combine(framesDir, "frame-" + frame.ToString("0000") + ".png");
            using (Bitmap bitmap = new Bitmap(Width, Height, PixelFormat.Format32bppArgb))
            using (Graphics g = Graphics.FromImage(bitmap))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;
                g.Clear(Color.FromArgb(251, 250, 247));

                double t = frame / (double)Fps;
                if (t < 1.8) DrawIntro(g, t);
                else if (t >= 18.0) DrawOutro(g, t);
                else DrawScene(g, assets, t);

                bitmap.Save(file, ImageFormat.Png);
            }

            if (frame % 30 == 0) Console.WriteLine("rendered " + frame + "/" + TotalFrames);
        }

        for (int i = 0; i < assets.Length; i++) assets[i].Dispose();
    }

    static double Clamp(double v) { return Math.Max(0, Math.Min(1, v)); }
    static double Lerp(double a, double b, double p) { return a + (b - a) * p; }
    static double EaseOut(double n) { n = Clamp(n); return 1 - Math.Pow(1 - n, 3); }
    static double EaseInOut(double n)
    {
        n = Clamp(n);
        return n < 0.5 ? 4 * n * n * n : 1 - Math.Pow(-2 * n + 2, 3) / 2;
    }
    static double Pop(double n) { n = Clamp(n); return 1 + Math.Sin(n * Math.PI) * 0.07; }

    static SolidBrush Brush(Color color) { return new SolidBrush(color); }
    static Pen Pen(Color color, float width) { Pen pen = new Pen(color, width); pen.StartCap = LineCap.Round; pen.EndCap = LineCap.Round; pen.LineJoin = LineJoin.Round; return pen; }
    static Color Ink() { return Color.FromArgb(23, 20, 15); }
    static Color SoftInk() { return Color.FromArgb(38, 31, 24); }
    static Color Muted() { return Color.FromArgb(91, 84, 72); }
    static Color Paper() { return Color.FromArgb(255, 253, 248); }

    static GraphicsPath RoundRect(float x, float y, float w, float h, float r)
    {
        GraphicsPath p = new GraphicsPath();
        float d = r * 2;
        p.AddArc(x, y, d, d, 180, 90);
        p.AddArc(x + w - d, y, d, d, 270, 90);
        p.AddArc(x + w - d, y + h - d, d, d, 0, 90);
        p.AddArc(x, y + h - d, d, d, 90, 90);
        p.CloseFigure();
        return p;
    }

    static void FillRoundRect(Graphics g, float x, float y, float w, float h, float r, Color fill, Color stroke, float strokeWidth)
    {
        using (GraphicsPath p = RoundRect(x, y, w, h, r))
        using (SolidBrush b = Brush(fill))
        using (Pen pen = Pen(stroke, strokeWidth))
        {
            g.FillPath(b, p);
            if (strokeWidth > 0) g.DrawPath(pen, p);
        }
    }

    static void CenterText(Graphics g, string value, float x, float y, float size, Color fill, FontStyle style)
    {
        using (Font font = new Font("Segoe UI", size, style, GraphicsUnit.Pixel))
        using (SolidBrush brush = Brush(fill))
        using (StringFormat format = new StringFormat())
        {
            format.Alignment = StringAlignment.Center;
            format.LineAlignment = StringAlignment.Center;
            g.DrawString(value, font, brush, new PointF(x, y), format);
        }
    }

    static void LeftText(Graphics g, string value, float x, float y, float size, Color fill, FontStyle style)
    {
        using (Font font = new Font("Segoe UI", size, style, GraphicsUnit.Pixel))
        using (SolidBrush brush = Brush(fill))
        {
            g.DrawString(value, font, brush, new PointF(x, y));
        }
    }

    static void DrawImageOpacity(Graphics g, Image img, RectangleF dest, float opacity)
    {
        ColorMatrix matrix = new ColorMatrix();
        matrix.Matrix33 = opacity;
        using (ImageAttributes attr = new ImageAttributes())
        {
            attr.SetColorMatrix(matrix, ColorMatrixFlag.Default, ColorAdjustType.Bitmap);
            g.DrawImage(img, Rectangle.Round(dest), 0, 0, img.Width, img.Height, GraphicsUnit.Pixel, attr);
        }
    }

    static void DrawOpenClaw(Graphics g, float x, float y, float scale, string mood, double wave, double bob, Color body, Color scarf)
    {
        GraphicsState state = g.Save();
        g.TranslateTransform(x, y + (float)(Math.Sin(bob) * 10));
        g.ScaleTransform(scale, scale);

        using (SolidBrush shadow = Brush(Color.FromArgb(34, 67, 55, 35))) g.FillEllipse(shadow, -92, 78, 184, 42);
        using (Pen line = Pen(SoftInk(), 9))
        {
            g.DrawLine(line, -58, 76, -88, 118);
            g.DrawLine(line, 58, 76, 88, 118);
            using (GraphicsPath lp = new GraphicsPath())
            using (GraphicsPath rp = new GraphicsPath())
            {
                lp.AddBezier(-92, 118, -112, 128, -132, 116, -132, 116);
                rp.AddBezier(92, 118, 112, 128, 132, 116, 132, 116);
                g.DrawPath(line, lp);
                g.DrawPath(line, rp);
            }
        }

        using (Pen antenna = Pen(SoftInk(), 7))
        {
            g.DrawLine(antenna, -45, -92, -75, -146);
            g.DrawLine(antenna, 45, -92, 75, -146);
        }
        using (SolidBrush blue = Brush(Color.FromArgb(93, 151, 217)))
        using (SolidBrush red = Brush(Color.FromArgb(223, 91, 83)))
        using (Pen stroke = Pen(SoftInk(), 5))
        {
            g.FillEllipse(blue, -94, -168, 30, 30); g.DrawEllipse(stroke, -94, -168, 30, 30);
            g.FillEllipse(red, 64, -168, 30, 30); g.DrawEllipse(stroke, 64, -168, 30, 30);
        }

        using (GraphicsPath bodyPath = new GraphicsPath())
        using (Pen stroke = Pen(SoftInk(), 7))
        {
            bodyPath.AddEllipse(-112, -112, 224, 224);
            using (PathGradientBrush glow = new PathGradientBrush(bodyPath))
            {
                glow.CenterColor = Color.FromArgb(255, Math.Min(255, body.R + 24), Math.Min(255, body.G + 22), Math.Min(255, body.B + 18));
                glow.SurroundColors = new Color[] { body };
                glow.CenterPoint = new PointF(-32, -38);
                g.FillPath(glow, bodyPath);
            }
            g.DrawPath(stroke, bodyPath);
        }

        using (SolidBrush highlight = Brush(Color.FromArgb(72, 255, 255, 238)))
        using (SolidBrush blush = Brush(Color.FromArgb(92, 229, 128, 118)))
        {
            g.FillEllipse(highlight, -70, -76, 74, 42);
            g.FillEllipse(blush, -82, 18, 34, 18);
            g.FillEllipse(blush, 50, 18, 34, 18);
        }

        using (Pen texture = Pen(Color.FromArgb(42, 255, 255, 238), 2))
        {
            g.DrawArc(texture, -78, -62, 156, 132, 205, 78);
            g.DrawArc(texture, -65, -50, 132, 112, 206, 66);
        }

        using (GraphicsPath scarfPath = new GraphicsPath())
        using (SolidBrush sb = Brush(scarf))
        using (Pen stroke = Pen(SoftInk(), 5))
        {
            scarfPath.AddBezier(-84, 56, -45, 84, 45, 84, 84, 56);
            scarfPath.AddLine(84, 56, 84, 86);
            scarfPath.AddBezier(84, 86, 42, 116, -42, 116, -84, 86);
            scarfPath.CloseFigure();
            g.FillPath(sb, scarfPath);
            g.DrawPath(stroke, scarfPath);
        }

        float eyeY = mood == "happy" ? -8 : -4;
        using (SolidBrush eye = Brush(SoftInk()))
        using (SolidBrush shine = Brush(Color.White))
        {
            g.FillEllipse(eye, -54, eyeY - 16, 28, 32);
            g.FillEllipse(eye, 26, eyeY - 16, 28, 32);
            g.FillEllipse(shine, -42, eyeY - 11, 8, 8);
            g.FillEllipse(shine, 38, eyeY - 11, 8, 8);
        }

        using (Pen mouthPen = Pen(SoftInk(), 5))
        using (GraphicsPath mouth = new GraphicsPath())
        {
            if (mood == "happy") mouth.AddBezier(-28, 30, -10, 52, 10, 52, 28, 30);
            else mouth.AddBezier(-25, 33, -8, 42, 8, 42, 25, 33);
            g.DrawPath(mouthPen, mouth);
        }

        DrawClaw(g, -111, -18, -18 + (float)(Math.Sin(wave) * 18), -1);
        DrawClaw(g, 111, -18, 18 + (float)(Math.Cos(wave * 0.9) * 15), 1);

        g.Restore(state);
    }

    static void DrawClaw(Graphics g, float x, float y, float angle, int side)
    {
        GraphicsState state = g.Save();
        g.TranslateTransform(x, y);
        g.RotateTransform(angle);
        using (Pen pen = Pen(SoftInk(), 10))
        using (GraphicsPath a = new GraphicsPath())
        using (GraphicsPath b = new GraphicsPath())
        {
            a.AddBezier(0, 0, side * 40, -34, side * 72, -28, side * 88, -2);
            b.AddBezier(0, 0, side * 35, 28, side * 68, 22, side * 88, -2);
            g.DrawPath(pen, a);
            g.DrawPath(pen, b);
        }
        g.Restore(state);
    }

    static void DrawProofCard(Graphics g, float x, float y, float scale, string title, string sub, Color accent)
    {
        GraphicsState state = g.Save();
        g.TranslateTransform(x, y);
        g.ScaleTransform(scale, scale);
        using (SolidBrush sh = Brush(Color.FromArgb(33, 23, 20, 15))) FillRoundRect(g, 10, 10, 360, 196, 18, Color.FromArgb(33, 23, 20, 15), Color.Transparent, 0);
        FillRoundRect(g, 0, 0, 360, 196, 18, Paper(), Ink(), 5);
        FillRoundRect(g, 24, 26, 74, 74, 18, accent, Ink(), 4);
        LeftText(g, title, 118, 42, 28, Ink(), FontStyle.Bold);
        LeftText(g, sub, 118, 78, 20, Muted(), FontStyle.Regular);
        FillRoundRect(g, 26, 126, 304, 18, 9, Color.FromArgb(237, 230, 214), Color.Transparent, 0);
        FillRoundRect(g, 26, 158, 224, 18, 9, Color.FromArgb(237, 230, 214), Color.Transparent, 0);
        g.Restore(state);
    }

    static void DrawHeader(Graphics g, string title, string subtitle, double enter)
    {
        float y = (float)Lerp(192, 158, EaseOut(enter));
        CenterText(g, title, Width / 2, y, 54, Ink(), FontStyle.Bold);
        CenterText(g, subtitle, Width / 2, y + 64, 30, Muted(), FontStyle.Bold);
    }

    static void DrawIntro(Graphics g, double t)
    {
        double p = EaseOut(t / 1.8);
        using (SolidBrush b1 = Brush(Color.FromArgb(31, 59, 130, 246))) g.FillEllipse(b1, 106, 238, 160, 160);
        using (SolidBrush b2 = Brush(Color.FromArgb(31, 240, 107, 53))) g.FillEllipse(b2, 784, 1348, 220, 220);
        DrawOpenClaw(g, 540, (float)Lerp(980, 850, p), (float)Lerp(0.84, 1.08, p), "happy", t * 9, t * 5, Color.FromArgb(242, 209, 107), Color.FromArgb(240, 107, 53));
        CenterText(g, "APPARENT", 540, 1235, 74, Ink(), FontStyle.Bold);
        CenterText(g, "Proof gets funded faster.", 540, 1300, 34, Muted(), FontStyle.Bold);
    }

    static void DrawOutro(Graphics g, double t)
    {
        double p = EaseOut((t - 18) / 2);
        DrawOpenClaw(g, 540, (float)Lerp(870, 725, p), 0.98f, "happy", t * 9, t * 4, Color.FromArgb(242, 209, 107), Color.FromArgb(240, 107, 53));
        CenterText(g, "Run npx apparent", 540, 1165, 66, Ink(), FontStyle.Bold);
        CenterText(g, "Turn proof into investor signal.", 540, 1232, 33, Muted(), FontStyle.Bold);
        GraphicsState state = g.Save();
        g.TranslateTransform(540, 1368);
        g.ScaleTransform((float)Pop(p), (float)Pop(p));
        FillRoundRect(g, -238, -56, 476, 112, 56, Ink(), Color.Transparent, 0);
        CenterText(g, "Get discovered", 0, 5, 38, Paper(), FontStyle.Bold);
        g.Restore(state);
    }

    static void DrawScene(Graphics g, Image[] assets, double t)
    {
        int index = 0;
        for (int i = 0; i < Scenes.Length; i++)
        {
            if (t >= Double.Parse(Scenes[i][0]) && t < Double.Parse(Scenes[i][1])) { index = i; break; }
        }

        string[] scene = Scenes[index];
        double start = Double.Parse(scene[0]);
        double end = Double.Parse(scene[1]);
        double p = Clamp((t - start) / (end - start));
        double enter = Clamp((t - start) / 0.5);
        double scale = 1.02 + p * 0.035;
        DrawImageOpacity(g, assets[Int32.Parse(scene[4])], new RectangleF((float)((Width - 900 * scale) / 2), (float)(330 - (506 * scale - 506) / 2), (float)(900 * scale), (float)(506 * scale)), (float)(0.15 + Math.Sin(p * Math.PI) * 0.07));
        DrawHeader(g, scene[2], scene[3], enter);

        if (scene[5] == "sort") DrawSort(g, p, t);
        else if (scene[5] == "stamp") DrawStamp(g, p, t);
        else if (scene[5] == "map") DrawMap(g, p, t);
        else if (scene[5] == "weigh") DrawWeigh(g, p, t);
        else DrawBridge(g, p, t);

        using (Pen done = Pen(Ink(), 7))
        using (Pen left = Pen(Color.FromArgb(217, 208, 192), 7))
        {
            double progress = Clamp(t / Duration);
            g.DrawLine(done, 150, 1710, (float)(150 + 780 * progress), 1710);
            g.DrawLine(left, (float)(150 + 780 * progress), 1710, 930, 1710);
        }
    }

    static void DrawSort(Graphics g, double p, double t)
    {
        double gather = EaseInOut(p);
        string[] labels = {"repo", "launch", "users"};
        Color[] colors = {Color.FromArgb(59, 130, 246), Color.FromArgb(240, 107, 53), Color.FromArgb(34, 197, 94)};
        float[] sx = {110, 730, 420}; float[] sy = {680, 720, 600}; float[] ex = {250, 430, 610};
        for (int i = 0; i < 3; i++)
        {
            float wobble = (float)(Math.Sin(t * 5 + i) * 8);
            float x = (float)Lerp(sx[i], ex[i], gather);
            float y = (float)Lerp(sy[i], 1020, gather) + wobble * (float)(1 - gather);
            GraphicsState state = g.Save();
            g.TranslateTransform(x, y);
            g.RotateTransform(wobble);
            float s = (float)Pop(Clamp((p - i * 0.08) / 0.55));
            g.ScaleTransform(s, s);
            FillRoundRect(g, -92, -44, 184, 88, 16, colors[i], Ink(), 5);
            CenterText(g, labels[i], 0, -3, 27, Paper(), FontStyle.Bold);
            g.Restore(state);
        }
        DrawOpenClaw(g, 540, 1320, 1.02f, "happy", t * 7, t * 4, Color.FromArgb(242, 209, 107), Color.FromArgb(240, 107, 53));
    }

    static void DrawStamp(Graphics g, double p, double t)
    {
        double stamp = EaseOut(Clamp((p - 0.25) / 0.35));
        DrawProofCard(g, 230, 710, 1.7f, "Verified proof", "Built, shipped, used", Color.FromArgb(34, 197, 94));
        GraphicsState state = g.Save();
        g.TranslateTransform(540, 1040);
        g.RotateTransform(-10);
        float s = (float)Lerp(1.8, 1, stamp);
        g.ScaleTransform(s, s);
        FillRoundRect(g, -190, -62, 380, 124, 22, Paper(), Color.FromArgb(239, 68, 68), 9);
        CenterText(g, "INVESTOR READY", 0, 2, 38, Color.FromArgb(239, 68, 68), FontStyle.Bold);
        g.Restore(state);
        DrawOpenClaw(g, 260 + (float)(Math.Sin(t * 3) * 10), 1340, 0.74f, "focus", t * 6, t * 4, Color.FromArgb(217, 180, 255), Color.FromArgb(59, 130, 246));
        DrawOpenClaw(g, 820 + (float)(Math.Sin(t * 3 + 1) * 10), 1345, 0.76f, "happy", t * 7, t * 4 + 1, Color.FromArgb(242, 209, 107), Color.FromArgb(240, 107, 53));
    }

    static void DrawMap(Graphics g, double p, double t)
    {
        double route = EaseInOut(Clamp((p - 0.1) / 0.75));
        FillRoundRect(g, 162, 652, 780, 650, 20, Color.FromArgb(31, 23, 20, 15), Color.Transparent, 0);
        FillRoundRect(g, 150, 640, 780, 650, 20, Color.FromArgb(246, 239, 224), Ink(), 5);
        using (Pen routePen = Pen(Ink(), 8))
        using (GraphicsPath routePath = new GraphicsPath())
        {
            routePath.AddBezier(230, 1140, 380, 920, 510, 1250, 640, 990);
            routePath.AddBezier(640, 990, 700, 840, 760, 760, 840, 812);
            g.DrawPath(routePen, routePath);
        }
        string[] cities = {"NYC", "SF", "Austin", "Miami"};
        float[,] pts = {{230,1140},{478,1025},{655,990},{840,812}};
        for (int i = 0; i < 4; i++)
        {
            float r = (float)(30 + Math.Sin(t * 5 + i) * 4);
            Color c = i == 1 ? Color.FromArgb(240, 107, 53) : Color.FromArgb(59, 130, 246);
            using (SolidBrush b = Brush(c))
            using (Pen stroke = Pen(Ink(), 5))
            {
                g.FillEllipse(b, pts[i,0] - r, pts[i,1] - r, r * 2, r * 2);
                g.DrawEllipse(stroke, pts[i,0] - r, pts[i,1] - r, r * 2, r * 2);
            }
            CenterText(g, cities[i], pts[i,0], pts[i,1] + 74, 22, Ink(), FontStyle.Bold);
        }
        float dotX = (float)Lerp(260, 820, route);
        float dotY = (float)(Lerp(1150, 800, route) + Math.Sin(route * Math.PI * 3) * 45);
        using (SolidBrush dot = Brush(Color.FromArgb(34, 197, 94)))
        using (Pen stroke = Pen(Ink(), 6))
        {
            g.FillEllipse(dot, dotX - 24, dotY - 24, 48, 48);
            g.DrawEllipse(stroke, dotX - 24, dotY - 24, 48, 48);
        }
        DrawChip(g, "stage", 184, 1330, route > 0.2);
        DrawChip(g, "sector", 442, 1330, route > 0.45);
        DrawChip(g, "thesis", 700, 1330, route > 0.7);
        DrawOpenClaw(g, dotX, dotY - 105, 0.42f, "happy", t * 10, t * 6, Color.FromArgb(242, 209, 107), Color.FromArgb(34, 197, 94));
    }

    static void DrawChip(Graphics g, string label, float x, float y, bool active)
    {
        FillRoundRect(g, x, y, 196, 58, 29, active ? Ink() : Color.White, Ink(), 4);
        CenterText(g, label, x + 98, y + 26, 22, active ? Paper() : Ink(), FontStyle.Bold);
    }

    static void DrawWeigh(Graphics g, double p, double t)
    {
        float tilt = (float)(Math.Sin(t * 2.6) * 5 * (1 - Clamp((p - 0.55) / 0.3)));
        GraphicsState state = g.Save();
        g.TranslateTransform(540, 940);
        g.RotateTransform(tilt);
        using (Pen line = Pen(Ink(), 10))
        {
            g.DrawLine(line, -280, 0, 280, 0);
            g.DrawLine(line, 0, 0, 0, 360);
        }
        using (SolidBrush paper = Brush(Paper()))
        using (Pen stroke = Pen(Ink(), 6))
        {
            PointF[] left = {new PointF(-260,0), new PointF(-340,180), new PointF(-180,180)};
            PointF[] right = {new PointF(260,0), new PointF(180,180), new PointF(340,180)};
            g.FillPolygon(paper, left); g.DrawPolygon(stroke, left);
            g.FillPolygon(paper, right); g.DrawPolygon(stroke, right);
        }
        CenterText(g, "proof", -260, 128, 30, Ink(), FontStyle.Bold);
        CenterText(g, "thesis", 260, 128, 30, Ink(), FontStyle.Bold);
        g.Restore(state);
        double locked = EaseOut(Clamp((p - 0.46) / 0.35));
        using (SolidBrush green = Brush(Color.FromArgb(34, 197, 94)))
        using (Pen stroke = Pen(Ink(), 7))
        {
            g.FillEllipse(green, 454, 1284, 172, 172);
            g.DrawEllipse(stroke, 454, 1284, 172, 172);
        }
        using (Pen check = Pen(Paper(), 13))
        {
            g.DrawLines(check, new PointF[] {new PointF(502, 1367), new PointF(530, 1398), new PointF(585, 1336)});
        }
        DrawOpenClaw(g, 305, 1470, 0.58f, "happy", t * 6, t * 3, Color.FromArgb(217, 180, 255), Color.FromArgb(59, 130, 246));
        DrawOpenClaw(g, 775, 1470, 0.58f, "happy", t * 6 + 2, t * 3 + 1, Color.FromArgb(242, 209, 107), Color.FromArgb(240, 107, 53));
    }

    static void DrawBridge(Graphics g, double p, double t)
    {
        double bridge = EaseInOut(Clamp((p - 0.1) / 0.6));
        using (Pen bridgePen = Pen(Ink(), 12))
        using (GraphicsPath bridgePath = new GraphicsPath())
        {
            bridgePath.AddBezier(220, 1130, 380, 970, 660, 970, 840, 1130);
            g.DrawPath(bridgePen, bridgePath);
        }
        DrawProofCard(g, (float)Lerp(130, 360, bridge) - 130, 850, 0.82f, "Proof", "clear signal", Color.FromArgb(34, 197, 94));
        FillRoundRect(g, (float)Lerp(890, 720, bridge) - 140, 840, 280, 180, 20, Paper(), Ink(), 5);
        CenterText(g, "VC thesis", (float)Lerp(890, 720, bridge), 910, 30, Ink(), FontStyle.Bold);
        CenterText(g, "matches", (float)Lerp(890, 720, bridge), 968, 28, Color.FromArgb(240, 107, 53), FontStyle.Bold);
        if (p > 0.55)
        {
            FillRoundRect(g, 370, 1142, 340, 116, 58, Ink(), Color.Transparent, 0);
            CenterText(g, "warm intro", 540, 1195, 36, Paper(), FontStyle.Bold);
        }
        DrawOpenClaw(g, 270, 1435, 0.7f, "happy", t * 8, t * 4, Color.FromArgb(242, 209, 107), Color.FromArgb(240, 107, 53));
        DrawOpenClaw(g, 810, 1435, 0.7f, "happy", t * 8 + 2, t * 4 + 1, Color.FromArgb(217, 180, 255), Color.FromArgb(59, 130, 246));
    }

    static void WriteMusicWav(string file, int durationSeconds)
    {
        int sampleRate = 44100;
        int channels = 2;
        int bitsPerSample = 16;
        int samples = durationSeconds * sampleRate;
        int dataSize = samples * channels * (bitsPerSample / 8);
        byte[] buffer = new byte[44 + dataSize];
        WriteAscii(buffer, 0, "RIFF");
        WriteInt(buffer, 4, 36 + dataSize);
        WriteAscii(buffer, 8, "WAVE");
        WriteAscii(buffer, 12, "fmt ");
        WriteInt(buffer, 16, 16);
        WriteShort(buffer, 20, 1);
        WriteShort(buffer, 22, channels);
        WriteInt(buffer, 24, sampleRate);
        WriteInt(buffer, 28, sampleRate * channels * (bitsPerSample / 8));
        WriteShort(buffer, 32, channels * (bitsPerSample / 8));
        WriteShort(buffer, 34, bitsPerSample);
        WriteAscii(buffer, 36, "data");
        WriteInt(buffer, 40, dataSize);
        double[] roots = {146.83, 196.00, 246.94, 164.81};
        int[][] chordIntervals = new int[][] {
            new int[] {0, 4, 7, 11},
            new int[] {0, 5, 9, 12},
            new int[] {0, 3, 7, 10},
            new int[] {0, 5, 7, 12}
        };
        int[] arp = {0, 2, 3, 2, 1, 2, 3, 2};
        Random random = new Random(7);
        int offset = 44;
        for (int i = 0; i < samples; i++)
        {
            double second = i / (double)sampleRate;
            double bpm = 112.0;
            double beat = second * bpm / 60.0;
            int bar = (int)Math.Floor(beat / 4.0);
            int chordIndex = bar % roots.Length;
            double root = roots[chordIndex];
            int[] intervals = chordIntervals[chordIndex];

            double pad = 0;
            for (int c = 0; c < intervals.Length; c++)
            {
                double freq = root * Math.Pow(2, intervals[c] / 12.0);
                pad += Math.Sin(2 * Math.PI * freq * second + c * 0.23) * 0.055;
                pad += Math.Sin(2 * Math.PI * freq * 2 * second + c * 0.17) * 0.012;
            }

            int step = (int)Math.Floor(beat * 2) % arp.Length;
            double stepPhase = (beat * 2) % 1;
            double arpFreq = root * 2 * Math.Pow(2, intervals[arp[step]] / 12.0);
            double pluckEnv = Math.Exp(-stepPhase * 5.5);
            double pluck = (Math.Sin(2 * Math.PI * arpFreq * second) + Math.Sin(2 * Math.PI * arpFreq * 2 * second) * 0.18) * 0.085 * pluckEnv;

            double kickPhase = beat % 1.0;
            double kick = Math.Sin(2 * Math.PI * (54 + 18 * Math.Exp(-kickPhase * 12)) * second) * Math.Exp(-kickPhase * 9) * 0.46;
            double snarePhase = (beat + 2) % 4.0;
            double snare = Math.Exp(-snarePhase * 9) * (snarePhase < 0.32 ? (random.NextDouble() * 2 - 1) * 0.11 : 0);
            double hatPhase = (beat * 2) % 1.0;
            double hat = Math.Exp(-hatPhase * 18) * (random.NextDouble() * 2 - 1) * 0.035;
            double bass = Math.Sin(2 * Math.PI * (root / 2) * second) * 0.12 * (0.55 + 0.45 * Math.Sin(2 * Math.PI * second / 8.0));
            double fadeIn = Clamp(second / 0.55);
            double fadeOut = Clamp((durationSeconds - second) / 1.1);
            double sidechain = 0.78 + 0.22 * Clamp(kickPhase * 2.2);
            double value = SoftClip((pad * sidechain + pluck + bass * sidechain + kick + snare + hat) * Math.Min(fadeIn, fadeOut));
            short sample = (short)Math.Round(value * 32767);
            WriteShort(buffer, offset, sample);
            WriteShort(buffer, offset + 2, sample);
            offset += 4;
        }
        File.WriteAllBytes(file, buffer);
    }

    static void WriteAscii(byte[] buffer, int offset, string value)
    {
        for (int i = 0; i < value.Length; i++) buffer[offset + i] = (byte)value[i];
    }
    static void WriteInt(byte[] buffer, int offset, int value)
    {
        byte[] bytes = BitConverter.GetBytes(value);
        Buffer.BlockCopy(bytes, 0, buffer, offset, 4);
    }
    static void WriteShort(byte[] buffer, int offset, int value)
    {
        byte[] bytes = BitConverter.GetBytes((short)value);
        Buffer.BlockCopy(bytes, 0, buffer, offset, 2);
    }
    static double SoftClip(double value)
    {
        if (value > 1) return 1;
        if (value < -1) return -1;
        return Math.Tanh(value * 1.35) / Math.Tanh(1.35);
    }
}
"@

Add-Type -ReferencedAssemblies "System.Drawing" -TypeDefinition $rendererSource
[OpenClawPromoRenderer]::Render($FramesDir, $AssetDir, $MusicPath)
