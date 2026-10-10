#!/usr/bin/env python3
"""
Uploads social/upload/posts to the Planlete social R2 bucket, keeping the same paths
(posts/reels/<slug>/<slug>.mp4, posts/photo/<slug>/...), so the SocialPilot CSV links resolve.

Reads keys from social/.env (gitignored; copy .env.example and fill it in yourself).
Skips files already in the bucket with the same size, so it is safe to re-run after every new batch.

    python3 social/upload_r2.py            # upload anything new or changed
    python3 social/upload_r2.py --dry-run  # list what would go up
"""
import mimetypes, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "upload")
PUBLIC = "https://pub-3ad74abe28dc4a4e90f5065bb7df55a6.r2.dev"


def load_env():
    path = os.path.join(HERE, ".env")
    if not os.path.exists(path):
        sys.exit("social/.env not found. Copy social/.env.example to social/.env and fill in the four R2 values.")
    env = {}
    for line in open(path):
        m = re.match(r'^\s*(R2_[A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$', line)
        if m:
            env[m.group(1)] = m.group(2).strip()
    missing = [k for k in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME") if not env.get(k)]
    if missing:
        sys.exit("social/.env is missing: " + ", ".join(missing))
    return env


def main():
    import boto3
    env, dry = load_env(), "--dry-run" in sys.argv
    s3 = boto3.client("s3", endpoint_url=f"https://{env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
                      aws_access_key_id=env["R2_ACCESS_KEY_ID"], aws_secret_access_key=env["R2_SECRET_ACCESS_KEY"],
                      region_name="auto")
    bucket = env["R2_BUCKET_NAME"]
    # Sanity check: the bucket must already hold the old carousels, or the links in the CSVs won't match.
    try:
        s3.head_object(Bucket=bucket, Key="posts/ig/38_cardio_myth/38_cardio_myth_01.png")
    except Exception:
        sys.exit(f"Bucket '{bucket}' doesn't contain posts/ig/38_cardio_myth/... - is this the social bucket behind {PUBLIC}?")
    sent = skipped = 0
    for dirpath, _, files in os.walk(os.path.join(ROOT, "posts")):
        for f in sorted(files):
            if f.startswith(".") or f.endswith(".html"):
                continue
            local = os.path.join(dirpath, f)
            key = os.path.relpath(local, ROOT).replace(os.sep, "/")
            size = os.path.getsize(local)
            try:
                if s3.head_object(Bucket=bucket, Key=key)["ContentLength"] == size:
                    skipped += 1
                    continue
            except Exception:
                pass
            ctype = mimetypes.guess_type(f)[0] or "application/octet-stream"
            print(("would upload " if dry else "uploading ") + key, f"({size // 1024} KB)")
            if not dry:
                s3.upload_file(local, bucket, key, ExtraArgs={"ContentType": ctype})
            sent += 1
    print(f"{'would upload' if dry else 'uploaded'} {sent}, already there {skipped}. Public base: {PUBLIC}/posts/...")


if __name__ == "__main__":
    main()
