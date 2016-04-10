"""
detector.py - uses LinearSVC to detect defects on wood boards
"""

import json
import sys
import os
import itertools

import concurrent.futures as cf

from extractors import *

import cv2
import numpy as np

from sklearn.externals import joblib
from sklearn.pipeline import FeatureUnion

from sklearn.cluster import KMeans, MiniBatchKMeans, AgglomerativeClustering


EXTRACTORS = [
    # ("gabor_energy", GaborEnergyExtractor()),
    # ("lbp", LbpExtractor()),
    ("hog", HogExtractor()),
    # ("hist", HistExtractor()),
    ("percentile", PercentilesExtractor()),
    # ("oulu", OuluExtractor()),
    # ("gist", GistExtractor()),
]

EXTRACTOR = FeatureUnion(EXTRACTORS)


def get_features(image):
    """Extracts features and runs image through classifier

    :image: TODO
    :returns: TODO

    """
    features = []
    for _, extractor in EXTRACTORS:
         _features = extractor.extract(image)
         features.append(_features)
    return np.concatenate(features)

WIN_SIZE = 16


def generate_windows(image, xs, ys):
    """generate windows

    :image: TODO
    :xs: TODO
    :ys: TODO
    :returns: TODO

    """
    for i, j in itertools.product(xs, ys):
        cut = image[i:i+WIN_SIZE, j:j+WIN_SIZE, :]
        yield cut


def process_image(image):
    """Takes image and yields defects it contains

    :image: TODO
    :returns: TODO

    """
    if isinstance(image, str):
        image = cv2.imread(image)
    # image = image[:, :, :]
    # brush = cv2.imread('brush.png', cv2.COLOR_BGR2GRAY)
    # brush = brush[:,:,0].astype(np.float)/255.0
    # print(brush.shape)
    dx = WIN_SIZE//2
    height, width = image.shape[:2]
    mask = np.zeros((height, width))

    _is = list(range(0, height - WIN_SIZE, dx))
    _js = list(range(0, width - WIN_SIZE, dx))

    windows_images = generate_windows(image, _is, _js)
    with cf.ProcessPoolExecutor(max_workers=4) as pp:
        features_f = pp.map(get_features, windows_images, chunksize=1000)
        features = np.array(list(features_f))
    # print(features.shape)
    M = features.shape[0]

    n_clusters = 10
    clusterer = MiniBatchKMeans(n_clusters=n_clusters, random_state=0)
    predicted = clusterer.fit_predict(features)

    clusters = np.arange(n_clusters)
    cluster_sizes = np.zeros(n_clusters)
    for c in clusters:
        cluster_sizes[c] = np.sum(predicted == c)
    # print(cluster_sizes)
    clusters = np.argsort(cluster_sizes)
    # print(clusters)
    # print(cluster_sizes[clusters])

    last_cluster = clusters[0]
    defect_clusters = set([last_cluster])
    defects_total = cluster_sizes[last_cluster]
    for c in clusters[1:]:
        cluster_size = cluster_sizes[c]
        if defects_total + cluster_size > 0.15 * M:
            break
        if cluster_size > 3 * cluster_sizes[last_cluster]:
            break
        defect_clusters.add(c)
        defects_total += cluster_size
        last_cluster = c

    # print(defect_clusters)

    for (i, j), cluster in zip(itertools.product(_is, _js), predicted):
        if cluster not in defect_clusters:
            continue
        mask[i:i+WIN_SIZE, j:j+WIN_SIZE] += dx

    mask = np.minimum(mask, 255)
    mask = mask.astype(np.uint8)

    # cv2.imwrite('mask_cluster.png', mask)

    mask_lim = np.percentile(mask, 10)
    _, mask_th = cv2.threshold(mask, mask_lim, 255, cv2.THRESH_BINARY)

    _, contours, hierarchy = cv2.findContours(mask_th, cv2.RETR_LIST,
            cv2.CHAIN_APPROX_SIMPLE)

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w < WIN_SIZE and h < WIN_SIZE:
            continue
        # print(x, y, w, h)
        # yield image[y:y+h, x:x+w, :]
        yield (x, y, w, h)
    # cv2.drawContours(image, contours, -1, (0, 255, 0), 3)
    # cv2.imwrite('contours_cluster.png', image)


def main(image_path, *args):
    """Main entry point

    :image_path: TODO
    :*args: TODO
    :returns: TODO

    """
    image = cv2.imread(image_path)
    image_name = os.path.basename(image_path)
    image_name, ext = os.path.splitext(image_name)
    if image is None:
        return -1
    name, _ = os.path.splitext(image_path)
    with open(name + "json", "w") as defects_f:
        json.dump(list(process_image(image_path)), defects_f)
        # h, w, _ = defect.shape
        # cv2.imwrite("detected_defects/%s_%s%s" % (image_name, i, ext), defect)
    return 0

if __name__ == '__main__':
    sys.exit(main(*sys.argv[1:]))
