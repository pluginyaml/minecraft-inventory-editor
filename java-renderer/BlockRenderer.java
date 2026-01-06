import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.util.Arrays;
import javax.imageio.ImageIO;

public class BlockRenderer {
    /** Output image size. */
    private static final int OUTPUT_SIZE = 300;
    /** Cube scale in 3D space. */
    private static final double CUBE_SIZE = 186.0;

    /** Rotation around X axis (tilt towards the camera). */
    private static final double PITCH = Math.toRadians(32.0);
    /** Rotation around Y axis (45° yaw). */
    private static final double YAW = Math.toRadians(45);

    private enum Face {
        TOP,
        FRONT,
        RIGHT
    }

    public static void main(String[] args) {
        if (args.length < 3) {
            System.err.println(
                    "Usage: java BlockRenderer <output_image> <render_type> <...textures>"
            );
            System.exit(1);
        }

        String outputPath = args[0];
        String renderType = args[1];
        String[] textures = Arrays.copyOfRange(args, 2, args.length);

        try {
            switch (renderType) {
                case "cube_all":
                    if (textures.length < 1) {
                        throw new IllegalArgumentException(
                                "cube_all requires at least 1 texture"
                        );
                    }
                    renderCubeAll(textures[0], outputPath);
                    break;
                default:
                    throw new IllegalArgumentException("Unsupported render_type: " + renderType);
            }
            System.exit(0);
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }

    public static void renderCubeAll(String texturePath, String outputPath) throws IOException {
        BufferedImage texture = ImageIO.read(new File(texturePath));
        if (texture == null) {
            throw new IOException("Failed to load texture: " + texturePath);
        }

        BufferedImage output = new BufferedImage(
                OUTPUT_SIZE,
                OUTPUT_SIZE,
                BufferedImage.TYPE_INT_ARGB
        );
        Graphics2D g = output.createGraphics();

        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_SPEED);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_OFF);

        g.setComposite(AlphaComposite.Clear);
        g.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        g.setComposite(AlphaComposite.SrcOver);

        double centerX = OUTPUT_SIZE / 2.0;
        double centerY = OUTPUT_SIZE / 2.0;

        int[] topX = new int[4];
        int[] topY = new int[4];
        int[] frontX = new int[4];
        int[] frontY = new int[4];
        int[] rightX = new int[4];
        int[] rightY = new int[4];

        double[][] top3D = {
            {0, 1, 0}, {1, 1, 0}, {1, 1, 1}, {0, 1, 1}
        };
        double[][] front3D = {
            {0, 0, 1}, {1, 0, 1}, {1, 1, 1}, {0, 1, 1}
        };
        double[][] right3D = {
            {1, 0, 0}, {1, 1, 0}, {1, 1, 1}, {1, 0, 1}
        };

        for (int i = 0; i < 4; i++) {
            double[] p3d = top3D[i];
            double[] screen = project3DTo2D(p3d[0], p3d[1], p3d[2], centerX, centerY);
            topX[i] = (int)screen[0];
            topY[i] = (int)screen[1];
        }

        for (int i = 0; i < 4; i++) {
            double[] p3d = front3D[i];
            double[] screen = project3DTo2D(p3d[0], p3d[1], p3d[2], centerX, centerY);
            frontX[i] = (int)screen[0];
            frontY[i] = (int)screen[1];
        }

        for (int i = 0; i < 4; i++) {
            double[] p3d = right3D[i];
            double[] screen = project3DTo2D(p3d[0], p3d[1], p3d[2], centerX, centerY);
            rightX[i] = (int)screen[0];
            rightY[i] = (int)screen[1];
        }

        drawTexturedPolygon(output, texture, rightX, rightY, 0.55, Face.RIGHT);
        drawTexturedPolygon(output, texture, frontX, frontY, 0.74, Face.FRONT);
        drawTexturedPolygon(output, texture, topX, topY, 0.86, Face.TOP);

        g.dispose();

        ImageIO.write(output, "PNG", new File(outputPath));
    }

    private static double[] project3DTo2D(double x, double y, double z, double centerX, double centerY) {
        x = (x - 0.5) * CUBE_SIZE;
        y = (y - 0.5) * CUBE_SIZE;
        z = (z - 0.5) * CUBE_SIZE;

        double cosY = Math.cos(YAW);
        double sinY = Math.sin(YAW);
        double x1 = x * cosY - z * sinY;
        double z1 = x * sinY + z * cosY;

        double cosP = Math.cos(PITCH);
        double sinP = Math.sin(PITCH);
        double y1 = y * cosP - z1 * sinP;
        double z2 = y * sinP + z1 * cosP;

        double screenX = centerX + x1;
        double screenY = centerY - y1;

        return new double[]{screenX, screenY};
    }

    private static void drawTexturedPolygon(BufferedImage output, BufferedImage texture,
                                            int[] xPoints, int[] yPoints, double brightness, Face face) {
        int minX = Integer.MAX_VALUE, maxX = Integer.MIN_VALUE;
        int minY = Integer.MAX_VALUE, maxY = Integer.MIN_VALUE;
        for (int i = 0; i < xPoints.length; i++) {
            minX = Math.min(minX, xPoints[i]);
            maxX = Math.max(maxX, xPoints[i]);
            minY = Math.min(minY, yPoints[i]);
            maxY = Math.max(maxY, yPoints[i]);
        }

        int width = maxX - minX;
        int height = maxY - minY;

        if (width <= 0 || height <= 0) return;

        double p0x = xPoints[0];
        double p0y = yPoints[0];
        double e1x = xPoints[1] - xPoints[0];
        double e1y = yPoints[1] - yPoints[0];
        double e2x = xPoints[3] - xPoints[0];
        double e2y = yPoints[3] - yPoints[0];

        double det = e1x * e2y - e1y * e2x;
        if (Math.abs(det) < 1e-6) {
            // 面が潰れている場合は何もしない
            return;
        }

        double invDet = 1.0 / det;
        double m00 =  e2y * invDet; // u_x
        double m01 = -e2x * invDet; // u_y
        double m10 = -e1y * invDet; // v_x
        double m11 =  e1x * invDet; // v_y

        int clipMinX = Math.max(0, minX);
        int clipMaxX = Math.min(output.getWidth() - 1, maxX);
        int clipMinY = Math.max(0, minY);
        int clipMaxY = Math.min(output.getHeight() - 1, maxY);

        for (int y = clipMinY; y <= clipMaxY; y++) {
            for (int x = clipMinX; x <= clipMaxX; x++) {
                if (!isPointInPolygon(x, y, xPoints, yPoints)) {
                    continue;
                }

                double dx = x - p0x;
                double dy = y - p0y;

                double u = m00 * dx + m01 * dy;
                double v = m10 * dx + m11 * dy;

                if (face == Face.RIGHT) {
                    double uu = u;
                    double vv = v;
                    u = 1.0 - vv;
                    v = 1.0 - uu;
                } else if (face == Face.FRONT) {
                    v = 1.0 - v;
                }

                if (u < 0.0) u = 0.0;
                if (u > 1.0) u = 1.0;
                if (v < 0.0) v = 0.0;
                if (v > 1.0) v = 1.0;

                int texX = (int)Math.floor(u * texture.getWidth());
                int texY = (int)Math.floor(v * texture.getHeight());
                if (texX >= texture.getWidth()) texX = texture.getWidth() - 1;
                if (texY >= texture.getHeight()) texY = texture.getHeight() - 1;

                int rgb = texture.getRGB(texX, texY);
                int alpha = (rgb >> 24) & 0xFF;
                if (alpha == 0) continue; // 透明ピクセルはスキップ

                int r = (int)(((rgb >> 16) & 0xFF) * brightness);
                int g = (int)(((rgb >> 8) & 0xFF) * brightness);
                int b = (int)((rgb & 0xFF) * brightness);

                r = Math.min(255, Math.max(0, r));
                g = Math.min(255, Math.max(0, g));
                b = Math.min(255, Math.max(0, b));

                int adjustedRgb = (alpha << 24) | (r << 16) | (g << 8) | b;
                output.setRGB(x, y, adjustedRgb);
            }
        }
    }

    private static boolean isPointInPolygon(int x, int y, int[] xPoints, int[] yPoints) {
        boolean inside = false;
        int j = xPoints.length - 1;

        for (int i = 0; i < xPoints.length; i++) {
            int xi = xPoints[i], yi = yPoints[i];
            int xj = xPoints[j], yj = yPoints[j];

            if (yi == yj) {
                if (yi == y && ((xi <= x && x <= xj) || (xj <= x && x <= xi))) {
                    return true;
                }
                j = i;
                continue;
            }

            boolean intersect = ((yi > y) != (yj > y)) &&
                                (x <= (xj - xi) * (double)(y - yi) / (yj - yi) + xi);
            if (intersect) {
                inside = !inside;
            }
            j = i;
        }

        return inside;
    }
}

